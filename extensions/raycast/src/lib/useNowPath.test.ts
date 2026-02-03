/**
 * Tests for useNowPathFromStorage.
 *
 * Covers path resolution (useGlobal, lastResolvedPath, app/document context),
 * callback behavior (setUseGlobal, setLastResolvedPath, addAppPathMapping, addDocumentPathMapping),
 * and stability (callback references stable when storage and context unchanged).
 */
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useNowPathFromStorage, type UseNowPathOptions } from "./useNowPath";
import {
  NOW_USE_GLOBAL_KEY,
  NOW_DOCUMENT_PATHS_KEY,
  NOW_APP_PATHS_KEY,
  NOW_LAST_RESOLVED_PATH_KEY,
} from "./now";
import { useLocalStorage } from "@raycast/utils";

const mockGetFrontmostApplication = vi.fn();
const mockGetCurrentDocumentPath = vi.fn();
const mockResolveNowPathFromContext = vi.fn();
const mockSetUseGlobalValue = vi.fn();
const mockSetDocPathsValue = vi.fn();
const mockSetAppPathsValue = vi.fn();
const mockSetLastResolvedPathValue = vi.fn();

vi.mock("@raycast/api", () => ({
  getFrontmostApplication: () => mockGetFrontmostApplication(),
}));

vi.mock("@raycast/utils", () => ({
  useLocalStorage: vi.fn(),
}));

vi.mock(
  "./now",
  async (importOriginal: () => Promise<typeof import("./now")>) => {
    const actual = await importOriginal();
    return {
      ...actual,
      getCurrentDocumentPath: () => mockGetCurrentDocumentPath(),
      resolveNowPathFromContext: (
        opts: Parameters<typeof actual.resolveNowPathFromContext>[0],
      ) => mockResolveNowPathFromContext(opts),
    };
  },
);

const defaultPath = "/home/.now/focus.now.md";

function setStorage(values: Partial<Record<string, string>>) {
  const storage: Record<string, string> = {
    [NOW_USE_GLOBAL_KEY]: "false",
    [NOW_DOCUMENT_PATHS_KEY]: "{}",
    [NOW_APP_PATHS_KEY]: "{}",
    [NOW_LAST_RESOLVED_PATH_KEY]: "",
    ...values,
  };
  vi.mocked(useLocalStorage).mockImplementation(((
    key: string,
    initialValue?: string,
  ) => ({
    value: storage[key] ?? initialValue ?? "",
    setValue:
      key === NOW_USE_GLOBAL_KEY
        ? mockSetUseGlobalValue
        : key === NOW_DOCUMENT_PATHS_KEY
          ? mockSetDocPathsValue
          : key === NOW_APP_PATHS_KEY
            ? mockSetAppPathsValue
            : mockSetLastResolvedPathValue,
    removeValue: vi.fn().mockResolvedValue(undefined),
    isLoading: false,
  })) as typeof useLocalStorage);
}

function getDefaultOptions(): UseNowPathOptions {
  return { defaultPath };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetFrontmostApplication.mockResolvedValue(null);
  mockGetCurrentDocumentPath.mockResolvedValue(null);
  mockResolveNowPathFromContext.mockImplementation(
    ({
      defaultPath: def,
      useGlobal,
    }: {
      defaultPath: string;
      useGlobal: boolean;
    }) =>
      useGlobal
        ? {
            path: def,
            sourceLabel: "Global",
            appPathForCurrent: null,
            docPathForCurrent: null,
          }
        : {
            path: "/last",
            sourceLabel: "Last used — /last",
            appPathForCurrent: null,
            docPathForCurrent: null,
          },
  );
  setStorage({
    [NOW_USE_GLOBAL_KEY]: "false",
    [NOW_LAST_RESOLVED_PATH_KEY]: "/last",
  });
});

describe("useNowPathFromStorage", () => {
  describe("path resolution", () => {
    it("returns defaultPath and pathReady when useGlobal is true", async () => {
      setStorage({
        [NOW_USE_GLOBAL_KEY]: "true",
        [NOW_LAST_RESOLVED_PATH_KEY]: "",
      });
      const { result } = renderHook(() =>
        useNowPathFromStorage(getDefaultOptions()),
      );

      await waitFor(() => {
        expect(result.current.pathReady).toBe(true);
      });

      expect(result.current.nowFilePath).toBe(defaultPath);
      expect(result.current.sourceLabel).toBe("Global");
      expect(mockResolveNowPathFromContext).toHaveBeenCalledWith(
        expect.objectContaining({ useGlobal: true, defaultPath }),
      );
    });

    it("returns resolved path and pathReady when useGlobal is false and lastResolvedPath is set", async () => {
      setStorage({
        [NOW_USE_GLOBAL_KEY]: "false",
        [NOW_LAST_RESOLVED_PATH_KEY]: "/last",
      });
      mockResolveNowPathFromContext.mockReturnValue({
        path: "/last",
        sourceLabel: "Last used — /last",
        appPathForCurrent: null,
        docPathForCurrent: null,
      });

      const { result } = renderHook(() =>
        useNowPathFromStorage(getDefaultOptions()),
      );

      await waitFor(() => {
        expect(result.current.pathReady).toBe(true);
      });

      expect(result.current.nowFilePath).toBe("/last");
      expect(result.current.sourceLabel).toBe("Last used — /last");
      expect(mockResolveNowPathFromContext).toHaveBeenCalledWith(
        expect.objectContaining({
          useGlobal: false,
          lastResolvedPath: "/last",
        }),
      );
    });

    it("passes app and document path from getFrontmostApplication and getCurrentDocumentPath into resolveNowPathFromContext", async () => {
      mockGetFrontmostApplication.mockResolvedValue({
        name: "Terminal",
        bundleId: "com.apple.Terminal",
      });
      mockGetCurrentDocumentPath.mockResolvedValue("/doc/path.md");
      mockResolveNowPathFromContext.mockReturnValue({
        path: "/doc/now.now.md",
        sourceLabel: "Document — /doc/path.md",
        appPathForCurrent: null,
        docPathForCurrent: "/doc/now.now.md",
      });

      const { result } = renderHook(() =>
        useNowPathFromStorage(getDefaultOptions()),
      );

      await waitFor(() => {
        expect(result.current.pathReady).toBe(true);
      });

      expect(result.current.currentApp).toEqual({
        name: "Terminal",
        bundleId: "com.apple.Terminal",
      });
      expect(result.current.currentDocumentPath).toBe("/doc/path.md");
      expect(result.current.nowFilePath).toBe("/doc/now.now.md");
      expect(result.current.docPathForCurrent).toBe("/doc/now.now.md");
      expect(mockResolveNowPathFromContext).toHaveBeenCalledWith(
        expect.objectContaining({
          documentPath: "/doc/path.md",
          app: { name: "Terminal", bundleId: "com.apple.Terminal" },
        }),
      );
    });
  });

  describe("callbacks", () => {
    it("setUseGlobal(true) calls setUseGlobalValue with 'true'", async () => {
      const { result } = renderHook(() =>
        useNowPathFromStorage(getDefaultOptions()),
      );
      await waitFor(() => expect(result.current.pathReady).toBe(true));

      await act(async () => {
        await result.current.setUseGlobal(true);
      });

      expect(mockSetUseGlobalValue).toHaveBeenCalledWith("true");
    });

    it("setUseGlobal(false) calls setUseGlobalValue with 'false'", async () => {
      const { result } = renderHook(() =>
        useNowPathFromStorage(getDefaultOptions()),
      );
      await waitFor(() => expect(result.current.pathReady).toBe(true));

      await act(async () => {
        await result.current.setUseGlobal(false);
      });

      expect(mockSetUseGlobalValue).toHaveBeenCalledWith("false");
    });

    it("setLastResolvedPath(path) calls setLastResolvedPathValue with path", async () => {
      const { result } = renderHook(() =>
        useNowPathFromStorage(getDefaultOptions()),
      );
      await waitFor(() => expect(result.current.pathReady).toBe(true));

      await act(async () => {
        await result.current.setLastResolvedPath("/some/path");
      });

      expect(mockSetLastResolvedPathValue).toHaveBeenCalledWith("/some/path");
    });

    it("addAppPathMapping merges key into stored app paths and calls setAppPathsValue", async () => {
      setStorage({ [NOW_APP_PATHS_KEY]: '{"com.other": "/other.now.md"}' });
      const { result } = renderHook(() =>
        useNowPathFromStorage(getDefaultOptions()),
      );
      await waitFor(() => expect(result.current.pathReady).toBe(true));

      await act(async () => {
        await result.current.addAppPathMapping(
          "com.apple.Terminal",
          "/term.now.md",
        );
      });

      expect(mockSetAppPathsValue).toHaveBeenCalledWith(
        JSON.stringify({
          "com.other": "/other.now.md",
          "com.apple.Terminal": "/term.now.md",
        }),
      );
    });

    it("addDocumentPathMapping merges documentPath into stored document paths and calls setDocPathsValue", async () => {
      setStorage({
        [NOW_DOCUMENT_PATHS_KEY]: '{" /a/doc.md": "/a/now.now.md"}',
      });
      const { result } = renderHook(() =>
        useNowPathFromStorage(getDefaultOptions()),
      );
      await waitFor(() => expect(result.current.pathReady).toBe(true));

      await act(async () => {
        await result.current.addDocumentPathMapping(
          "/b/notes.md",
          "/b/notes.now.md",
        );
      });

      const call = mockSetDocPathsValue.mock.calls[0][0];
      expect(typeof call).toBe("string");
      const parsed = JSON.parse(call as string) as Record<string, string>;
      expect(parsed["/b/notes.md"]).toBe("/b/notes.now.md");
    });
  });

  describe("resolution loop", () => {
    it("does not re-run resolution when the only storage change is lastResolvedPath written by runResolution", async () => {
      setStorage({
        [NOW_USE_GLOBAL_KEY]: "false",
        [NOW_LAST_RESOLVED_PATH_KEY]: "/first",
      });
      mockResolveNowPathFromContext.mockReturnValue({
        path: "/second",
        sourceLabel: "Last used — /second",
        appPathForCurrent: null,
        docPathForCurrent: null,
      });

      const { result, rerender } = renderHook(() =>
        useNowPathFromStorage(getDefaultOptions()),
      );

      await waitFor(() => {
        expect(result.current.pathReady).toBe(true);
      });
      expect(result.current.nowFilePath).toBe("/second");
      expect(mockResolveNowPathFromContext).toHaveBeenCalledTimes(1);

      setStorage({
        [NOW_USE_GLOBAL_KEY]: "false",
        [NOW_DOCUMENT_PATHS_KEY]: "{}",
        [NOW_APP_PATHS_KEY]: "{}",
        [NOW_LAST_RESOLVED_PATH_KEY]: "/second",
      });
      rerender();

      expect(mockResolveNowPathFromContext).toHaveBeenCalledTimes(1);
    });
  });

  describe("refreshPathFromStorage", () => {
    it("re-runs resolution and updates nowFilePath", async () => {
      mockResolveNowPathFromContext
        .mockReturnValueOnce({
          path: "/first",
          sourceLabel: "Last used — /first",
          appPathForCurrent: null,
          docPathForCurrent: null,
        })
        .mockReturnValueOnce({
          path: "/second",
          sourceLabel: "Last used — /second",
          appPathForCurrent: null,
          docPathForCurrent: null,
        });

      setStorage({ [NOW_LAST_RESOLVED_PATH_KEY]: "/first" });
      const { result } = renderHook(() =>
        useNowPathFromStorage(getDefaultOptions()),
      );
      await waitFor(() => expect(result.current.pathReady).toBe(true));
      expect(result.current.nowFilePath).toBe("/first");

      await act(async () => {
        await result.current.refreshPathFromStorage();
      });

      expect(result.current.nowFilePath).toBe("/second");
    });
  });

  describe("stability", () => {
    it("returns stable callback references when storage and context are unchanged", async () => {
      const { result, rerender } = renderHook(() =>
        useNowPathFromStorage(getDefaultOptions()),
      );
      await waitFor(() => expect(result.current.pathReady).toBe(true));

      const firstRefresh = result.current.refreshPathFromStorage;
      const firstSetUseGlobal = result.current.setUseGlobal;
      const firstSetLastResolvedPath = result.current.setLastResolvedPath;
      const firstAddAppPathMapping = result.current.addAppPathMapping;
      const firstAddDocumentPathMapping = result.current.addDocumentPathMapping;

      rerender();
      await waitFor(() => expect(result.current.pathReady).toBe(true));

      expect(result.current.refreshPathFromStorage).toBe(firstRefresh);
      expect(result.current.setUseGlobal).toBe(firstSetUseGlobal);
      expect(result.current.setLastResolvedPath).toBe(firstSetLastResolvedPath);
      expect(result.current.addAppPathMapping).toBe(firstAddAppPathMapping);
      expect(result.current.addDocumentPathMapping).toBe(
        firstAddDocumentPathMapping,
      );
    });

    it("returns same object reference when pathContext and options are unchanged", async () => {
      const { result, rerender } = renderHook(() =>
        useNowPathFromStorage(getDefaultOptions()),
      );
      await waitFor(() => expect(result.current.pathReady).toBe(true));

      const firstReturn = result.current;
      rerender();
      await waitFor(() => expect(result.current.pathReady).toBe(true));

      expect(result.current).toBe(firstReturn);
    });
  });
});
