/**
 * Tests for useNowPathFromStorage.
 *
 * Covers path resolution (useGlobal, lastResolvedPath, app context),
 * callback behavior (setUseGlobal, setLastResolvedPath, addAppPathMapping),
 * and stability (callback references stable when storage and context unchanged).
 */
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useNowPathFromStorage, type UseNowPathOptions } from "./useNowPath";
import {
  NOW_USE_GLOBAL_KEY,
  NOW_APP_PATHS_KEY,
  NOW_LAST_RESOLVED_PATH_KEY,
} from "./now";
import { useLocalStorage } from "@raycast/utils";

const mockGetFrontmostApplication = vi.fn();
const mockResolveNowPathFromContext = vi.fn();
const mockSetUseGlobalValue = vi.fn();
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
      resolveNowPathFromContext: (
        opts: Parameters<typeof actual.resolveNowPathFromContext>[0],
      ) => mockResolveNowPathFromContext(opts),
    };
  },
);

const defaultPath = "/home/.now/focus.now.md";

const setValueByKey: Record<string, (value: string) => Promise<void>> = {
  [NOW_USE_GLOBAL_KEY]: mockSetUseGlobalValue,
  [NOW_APP_PATHS_KEY]: mockSetAppPathsValue,
  [NOW_LAST_RESOLVED_PATH_KEY]: mockSetLastResolvedPathValue,
};

function setStorage(values: Partial<Record<string, string>>) {
  const storage: Record<string, string> = {
    [NOW_USE_GLOBAL_KEY]: "false",
    [NOW_APP_PATHS_KEY]: "{}",
    [NOW_LAST_RESOLVED_PATH_KEY]: "",
    ...values,
  };
  vi.mocked(useLocalStorage).mockImplementation(((
    key: string,
    initialValue?: string,
  ) => ({
    value: storage[key] ?? initialValue ?? "",
    setValue: setValueByKey[key] ?? mockSetLastResolvedPathValue,
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
          }
        : {
            path: "/last",
            sourceLabel: "Last used — /last",
            appPathForCurrent: null,
          },
  );
  setStorage({
    [NOW_USE_GLOBAL_KEY]: "false",
    [NOW_LAST_RESOLVED_PATH_KEY]: "/last",
  });
});

function pathResolutionSpec() {
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

  it("passes app from getFrontmostApplication into resolveNowPathFromContext", async () => {
    mockGetFrontmostApplication.mockResolvedValue({
      name: "Terminal",
      bundleId: "com.apple.Terminal",
    });
    mockResolveNowPathFromContext.mockReturnValue({
      path: "/app/now.now.md",
      sourceLabel: "Terminal — /app/now.now.md",
      appPathForCurrent: "/app/now.now.md",
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
    expect(result.current.nowFilePath).toBe("/app/now.now.md");
    expect(result.current.appPathForCurrent).toBe("/app/now.now.md");
    expect(mockResolveNowPathFromContext).toHaveBeenCalledWith(
      expect.objectContaining({
        app: { name: "Terminal", bundleId: "com.apple.Terminal" },
      }),
    );
  });
}

function callbacksSpec() {
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
}

function resolutionLoopSpec() {
  it("does not re-run resolution when the only storage change is lastResolvedPath written by runResolution", async () => {
    setStorage({
      [NOW_USE_GLOBAL_KEY]: "false",
      [NOW_LAST_RESOLVED_PATH_KEY]: "/first",
    });
    mockResolveNowPathFromContext.mockReturnValue({
      path: "/second",
      sourceLabel: "Last used — /second",
      appPathForCurrent: null,
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
      [NOW_APP_PATHS_KEY]: "{}",
      [NOW_LAST_RESOLVED_PATH_KEY]: "/second",
    });
    rerender();

    expect(mockResolveNowPathFromContext).toHaveBeenCalledTimes(1);
  });
}

function refreshPathFromStorageSpec() {
  it("re-runs resolution and updates nowFilePath", async () => {
    mockResolveNowPathFromContext
      .mockReturnValueOnce({
        path: "/first",
        sourceLabel: "Last used — /first",
        appPathForCurrent: null,
      })
      .mockReturnValueOnce({
        path: "/second",
        sourceLabel: "Last used — /second",
        appPathForCurrent: null,
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
}

function stabilitySpec() {
  it("returns stable callback references when storage and context are unchanged", async () => {
    const { result, rerender } = renderHook(() =>
      useNowPathFromStorage(getDefaultOptions()),
    );
    await waitFor(() => expect(result.current.pathReady).toBe(true));

    const firstRefresh = result.current.refreshPathFromStorage;
    const firstSetUseGlobal = result.current.setUseGlobal;
    const firstSetLastResolvedPath = result.current.setLastResolvedPath;
    const firstAddAppPathMapping = result.current.addAppPathMapping;

    rerender();
    await waitFor(() => expect(result.current.pathReady).toBe(true));

    expect(result.current.refreshPathFromStorage).toBe(firstRefresh);
    expect(result.current.setUseGlobal).toBe(firstSetUseGlobal);
    expect(result.current.setLastResolvedPath).toBe(firstSetLastResolvedPath);
    expect(result.current.addAppPathMapping).toBe(firstAddAppPathMapping);
  });

  it("returns equivalent result when pathContext and options are unchanged", async () => {
    const { result, rerender } = renderHook(() =>
      useNowPathFromStorage(getDefaultOptions()),
    );
    await waitFor(() => expect(result.current.pathReady).toBe(true));

    const firstNowFilePath = result.current.nowFilePath;
    const firstPathReady = result.current.pathReady;
    rerender();
    await waitFor(() => expect(result.current.pathReady).toBe(true));

    expect(result.current.nowFilePath).toBe(firstNowFilePath);
    expect(result.current.pathReady).toBe(firstPathReady);
  });
}

function useNowPathFromStorageSpec() {
  describe("path resolution", pathResolutionSpec);
  describe("callbacks", callbacksSpec);
  describe("resolution loop", resolutionLoopSpec);
  describe("refreshPathFromStorage", refreshPathFromStorageSpec);
  describe("stability", stabilitySpec);
}

describe("useNowPathFromStorage", useNowPathFromStorageSpec);
