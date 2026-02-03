/**
 * Tests for useFocusData.
 *
 * Covers data loading (effectivePath, focus, items, error, isLoading),
 * pinning (initialPinnedPath, setPinnedPath, effectivePath),
 * applyMutationResult (mutate + setFocusCache),
 * refresh (revalidate),
 * and stability (callback references stable when path and data unchanged).
 */
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  useFocusData,
  fetchFocusData,
  type FocusDataResult,
} from "./useFocusData";
import type { JsonFocus, JsonItem } from "./now";
import type { MutationResult } from "./now";
import { useCachedPromise } from "@raycast/utils";
import type { FocusCacheEntry } from "./focusCache";

const mockRevalidate = vi.fn();
const mockMutate = vi.fn();
let mockData: FocusDataResult | undefined = undefined;
let mockIsLoading = false;
let mockError: Error | undefined = undefined;

const mockSetFocusCache = vi.fn();
const mockGetFocusCache = vi.fn();
const mockGetJsonFocus = vi.fn();
const mockGetJsonItems = vi.fn();

vi.mock("@raycast/utils", () => ({
  useCachedPromise: vi.fn(),
}));

vi.mock("./focusCache", () => ({
  getFocusCache: (path: string) => mockGetFocusCache(path),
  getFocusCacheSync: () => null,
  setFocusCache: (
    path: string,
    focus: string,
    breadcrumb: string,
    items?: unknown[],
  ) => mockSetFocusCache(path, focus, breadcrumb, items),
}));

vi.mock("./now", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./now")>();
  return {
    ...actual,
    getJsonFocus: (path: string) => mockGetJsonFocus(path),
    getJsonItems: (path: string) => mockGetJsonItems(path),
  };
});

function setUseCachedPromiseReturn(
  overrides: {
    data?: FocusDataResult | undefined;
    isLoading?: boolean;
    error?: Error | undefined;
  } = {},
) {
  mockData = overrides.data;
  mockIsLoading = overrides.isLoading ?? false;
  mockError = overrides.error;
  vi.mocked(useCachedPromise).mockImplementation(
    (
      _fn: (path: string) => Promise<FocusDataResult>,
      _deps: unknown[],
      opts?: { execute?: boolean },
    ) => {
      if (opts?.execute === false) {
        return {
          data: undefined,
          error: undefined,
          isLoading: false,
          revalidate: mockRevalidate,
          mutate: mockMutate,
        };
      }
      return {
        data: mockData,
        error: mockError,
        isLoading: mockIsLoading,
        revalidate: mockRevalidate,
        mutate: mockMutate,
      };
    },
  );
}

const sampleFocus: JsonFocus = {
  key: "key1",
  focus: "Current focus",
  breadcrumb: "a > b",
  isLeaf: true,
  isRoot: false,
};
const sampleItems: JsonItem[] = [
  { key: "key1", display: "Item 1" },
  { key: "key2", display: "Item 2" },
];
const sampleData: FocusDataResult = {
  focus: sampleFocus,
  items: sampleItems,
  error: false,
  errorMessage: null,
};

const sampleCacheEntry: FocusCacheEntry = {
  focus: "Cached focus",
  breadcrumb: "x > y",
  updatedAt: Date.now(),
  items: [{ key: "k1", display: "Cached item" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockMutate.mockResolvedValue(undefined);
  mockSetFocusCache.mockResolvedValue(undefined);
  mockGetFocusCache.mockResolvedValue(null);
  mockGetJsonFocus.mockResolvedValue({ data: sampleFocus });
  mockGetJsonItems.mockResolvedValue({ data: sampleItems });
  setUseCachedPromiseReturn({ data: sampleData, isLoading: false });
});

describe("fetchFocusData", () => {
  it("returns focus and items when getJsonFocus and getJsonItems resolve with data", async () => {
    mockGetJsonFocus.mockResolvedValue({ data: sampleFocus });
    mockGetJsonItems.mockResolvedValue({ data: sampleItems });
    const result = await fetchFocusData("/path");
    expect(result.focus).toEqual(sampleFocus);
    expect(result.items).toEqual(sampleItems);
    expect(result.error).toBe(false);
    expect(result.errorMessage).toBeNull();
    expect(mockGetJsonFocus).toHaveBeenCalledWith("/path");
    expect(mockGetJsonItems).toHaveBeenCalledWith("/path");
  });

  it("returns error true and errorMessage when both focus and items are null", async () => {
    mockGetJsonFocus.mockResolvedValue({ data: null, error: "Read failed" });
    mockGetJsonItems.mockResolvedValue({ data: null, error: "CLI failed" });
    const result = await fetchFocusData("/path");
    expect(result.focus).toBeNull();
    expect(result.items).toBeNull();
    expect(result.error).toBe(true);
    expect(result.errorMessage).toBe("Read failed");
  });
});

describe("useFocusData", () => {
  describe("data loading", () => {
    it("returns focus and items from useCachedPromise data when nowFilePath is set", () => {
      const { result } = renderHook(() => useFocusData("/path/to/now.now.md"));

      expect(result.current.focus).toEqual(sampleFocus);
      expect(result.current.items).toEqual(sampleItems);
      expect(result.current.error).toBe(false);
      expect(result.current.errorMessage).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.effectivePath).toBe("/path/to/now.now.md");
    });

    it("returns error and errorMessage when data.error is true", () => {
      setUseCachedPromiseReturn({
        data: {
          focus: null,
          items: null,
          error: true,
          errorMessage: "CLI failed",
        },
      });
      const { result } = renderHook(() => useFocusData("/path"));

      expect(result.current.focus).toBeNull();
      expect(result.current.items).toBeNull();
      expect(result.current.error).toBe(true);
      expect(result.current.errorMessage).toBe("CLI failed");
    });

    it("surfaces hook error when useCachedPromise returns error", () => {
      setUseCachedPromiseReturn({
        data: sampleData,
        error: new Error("Network error"),
      });
      const { result } = renderHook(() => useFocusData("/path"));

      expect(result.current.error).toBe(true);
      expect(result.current.errorMessage).toBe("Network error");
    });

    it("returns isLoading true when useCachedPromise isLoading is true", () => {
      setUseCachedPromiseReturn({ data: undefined, isLoading: true });
      const { result } = renderHook(() => useFocusData("/path"));

      expect(result.current.isLoading).toBe(true);
    });

    it("does not execute fetch when nowFilePath is null", () => {
      renderHook(() => useFocusData(null));
      expect(useCachedPromise).toHaveBeenCalledWith(
        expect.any(Function),
        [""],
        expect.objectContaining({ execute: false }),
      );
    });
  });

  describe("effectivePath and pinning", () => {
    it("uses nowFilePath as effectivePath when initialPinnedPath is not set", () => {
      const { result } = renderHook(() => useFocusData("/global/now.now.md"));
      expect(result.current.effectivePath).toBe("/global/now.now.md");
    });

    it("uses initialPinnedPath as effectivePath when set", () => {
      const { result } = renderHook(() =>
        useFocusData("/global/now.now.md", "/pinned/now.now.md"),
      );
      expect(result.current.effectivePath).toBe("/pinned/now.now.md");
    });

    it("setPinnedPath updates effectivePath", async () => {
      const { result } = renderHook(() => useFocusData("/global/now.now.md"));
      expect(result.current.effectivePath).toBe("/global/now.now.md");

      act(() => {
        result.current.setPinnedPath("/other/now.now.md");
      });

      expect(result.current.effectivePath).toBe("/other/now.now.md");
    });

    it("setPinnedPath(null) clears pin and falls back to nowFilePath", async () => {
      const { result } = renderHook(() =>
        useFocusData("/global/now.now.md", "/pinned/now.now.md"),
      );
      expect(result.current.effectivePath).toBe("/pinned/now.now.md");

      act(() => {
        result.current.setPinnedPath(null);
      });

      expect(result.current.effectivePath).toBe("/global/now.now.md");
    });
  });

  describe("refresh", () => {
    it("calls revalidate when refresh is invoked", async () => {
      const { result } = renderHook(() => useFocusData("/path"));
      await act(async () => {
        await result.current.refresh();
      });
      expect(mockRevalidate).toHaveBeenCalled();
    });
  });

  describe("applyMutationResult", () => {
    it("calls mutate with optimisticUpdate and then setFocusCache when effectivePath is set", async () => {
      const { result } = renderHook(() => useFocusData("/path"));
      const mutationResult: MutationResult = {
        focus: {
          key: "key2",
          focus: "New focus",
          breadcrumb: "a > b > c",
          isLeaf: true,
          isRoot: false,
        },
        items: [
          { key: "key2", display: "New focus" },
          { key: "key3", display: "Other" },
        ],
      };

      await act(async () => {
        await result.current.applyMutationResult(mutationResult);
      });

      expect(mockMutate).toHaveBeenCalledWith(
        Promise.resolve(),
        expect.objectContaining({
          shouldRevalidateAfter: false,
          optimisticUpdate: expect.any(Function),
        }),
      );
      const optimisticUpdate = mockMutate.mock.calls[0][1].optimisticUpdate;
      const updated = optimisticUpdate(sampleData);
      expect(updated?.focus).toEqual(mutationResult.focus);
      expect(updated?.items).toEqual(mutationResult.items);
      expect(updated?.error).toBe(false);
      expect(updated?.errorMessage).toBeNull();

      expect(mockSetFocusCache).toHaveBeenCalledWith(
        "/path",
        mutationResult.focus.focus,
        mutationResult.focus.breadcrumb,
        mutationResult.items,
      );
    });

    it("does not call setFocusCache when effectivePath is null", async () => {
      setUseCachedPromiseReturn({ data: undefined });
      const { result } = renderHook(() => useFocusData(null));
      const mutationResult: MutationResult = {
        focus: sampleFocus,
        items: sampleItems,
      };

      await act(async () => {
        await result.current.applyMutationResult(mutationResult);
      });

      expect(mockMutate).toHaveBeenCalled();
      expect(mockSetFocusCache).not.toHaveBeenCalled();
    });
  });

  describe("stability", () => {
    it("returns stable refresh, applyMutationResult, setPinnedPath when path and data are unchanged", async () => {
      const { result, rerender } = renderHook(() => useFocusData("/path"));
      const firstRefresh = result.current.refresh;
      const firstApplyMutationResult = result.current.applyMutationResult;
      const firstSetPinnedPath = result.current.setPinnedPath;

      rerender();
      await waitFor(() => {
        expect(result.current.focus).toEqual(sampleFocus);
      });

      expect(result.current.refresh).toBe(firstRefresh);
      expect(result.current.applyMutationResult).toBe(firstApplyMutationResult);
      expect(result.current.setPinnedPath).toBe(firstSetPinnedPath);
    });
  });

  describe("cacheOnly and maxCacheAgeMs", () => {
    it("when cacheOnly and path set, returns focus from getFocusCache and does not execute fetch", async () => {
      mockGetFocusCache.mockResolvedValue(sampleCacheEntry);
      const { result } = renderHook(() =>
        useFocusData("/path", null, { cacheOnly: true }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.focus?.focus).toBe("Cached focus");
      expect(result.current.focus?.breadcrumb).toBe("x > y");
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items?.[0].display).toBe("Cached item");
      expect(mockGetFocusCache).toHaveBeenCalledWith("/path");
      expect(useCachedPromise).toHaveBeenCalledWith(
        expect.any(Function),
        ["/path"],
        expect.objectContaining({ execute: false }),
      );
    });

    it("when maxCacheAgeMs and cache fresh, uses cache and does not refetch", async () => {
      const freshEntry: FocusCacheEntry = {
        ...sampleCacheEntry,
        updatedAt: Date.now() - 1000,
      };
      mockGetFocusCache.mockResolvedValue(freshEntry);
      const { result } = renderHook(() =>
        useFocusData("/path", null, { maxCacheAgeMs: 60_000 }),
      );

      await waitFor(() => {
        expect(result.current.focus?.focus).toBe("Cached focus");
      });

      expect(result.current.focus?.breadcrumb).toBe("x > y");
      expect(result.current.isLoading).toBe(false);
      expect(useCachedPromise).toHaveBeenCalledWith(
        expect.any(Function),
        ["/path"],
        expect.objectContaining({ execute: false }),
      );
    });

    it("when maxCacheAgeMs and cache stale or missing, fetches", async () => {
      const staleEntry: FocusCacheEntry = {
        ...sampleCacheEntry,
        updatedAt: Date.now() - 70_000,
      };
      mockGetFocusCache.mockResolvedValue(staleEntry);
      const { result } = renderHook(() =>
        useFocusData("/path", null, { maxCacheAgeMs: 60_000 }),
      );

      await waitFor(() => {
        expect(result.current.focus).toEqual(sampleFocus);
      });

      expect(result.current.focus?.focus).toBe("Current focus");
      expect(useCachedPromise).toHaveBeenCalledWith(
        expect.any(Function),
        ["/path"],
        expect.objectContaining({ execute: true }),
      );
    });
  });
});
