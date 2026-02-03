/**
 * Hook and fetcher for focus + items for a single Now file path.
 *
 * Used by list-focus to load and mutate focus data; writes to focus cache so menu-bar-focus can read the same state.
 * Options cacheOnly and maxCacheAgeMs are for menu-bar usage (cache-only when background, use cache when fresh).
 */
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getJsonFocus, getJsonItems, type MutationResult } from "./now";
import type { JsonFocus, JsonItem } from "./now";
import { getFocusCache, setFocusCache, type FocusCacheEntry } from "./focusCache";

/**
 * Result shape of {@link fetchFocusData} and the cached promise used by {@link useFocusData}.
 * Exported for tests and type reuse.
 */
export type FocusDataResult = {
  focus: JsonFocus | null;
  items: JsonItem[] | null;
  error: boolean;
  errorMessage: string | null;
};

/** Build JsonFocus from cache entry (menubar only uses focus/breadcrumb; key/isLeaf/isRoot are placeholders). */
function cacheEntryToJsonFocus(entry: FocusCacheEntry): JsonFocus {
  return {
    key: "",
    focus: entry.focus,
    breadcrumb: entry.breadcrumb,
    isLeaf: true,
    isRoot: false,
  };
}

/** Build FocusDataResult from cache entry for useFocusData return shape. */
function cacheEntryToFocusDataResult(entry: FocusCacheEntry): FocusDataResult {
  return {
    focus: cacheEntryToJsonFocus(entry),
    items: entry.items ?? null,
    error: false,
    errorMessage: null,
  };
}

/**
 * Fetches focus and items for the given Now file path.
 * Calls getJsonFocus and getJsonItems in parallel; treats both-null as error and surfaces error message.
 *
 * @param path - Resolved path to the .now.md file.
 * @returns FocusDataResult with focus, items, and error/errorMessage when both are null.
 */
export async function fetchFocusData(path: string): Promise<FocusDataResult> {
  const [focusResult, itemsResult] = await Promise.all([
    getJsonFocus(path),
    getJsonItems(path),
  ]);
  const focus = focusResult.data ?? null;
  const items = itemsResult.data ?? null;
  const bothNull = focus === null && items === null;
  return {
    focus,
    items,
    error: bothNull,
    errorMessage: bothNull ? (focusResult.error ?? itemsResult.error ?? null) : null,
  };
}

/**
 * Return value of {@link useFocusData}.
 *
 * **Stable across rerenders** (same reference unless dependencies change): `refresh`, `applyMutationResult`, `setPinnedPath`.  
 * **Memoized when source is data**: when useFocusData returns from useCachedPromise `data` (not cacheOnly/freshCache), `focus` and `items` are memoized by content so unchanged content yields the same reference.  
 * **Not stable** (new reference when data or path change): `effectivePath`.  
 * **Primitives**: `error`, `errorMessage`, `isLoading` are values, not refs.
 *
 * @property focus - Current focus (key, focus, breadcrumb) or null.
 * @property items - Focusable items list or null.
 * @property error - True when both focus and items were null (load/CLI error).
 * @property errorMessage - Error message when error is true, or hook error message.
 * @property isLoading - True while useCachedPromise is loading.
 * @property refresh - Revalidates the cached promise (returns revalidate()). Stable: depends only on revalidate.
 * @property applyMutationResult - Applies a mutation result optimistically and writes to focus cache. Depends on effectivePath and mutate.
 * @property setPinnedPath - Setter for pinned path (user-switched file). Stable (React setState).
 * @property effectivePath - Path currently used for fetch and mutations (pinnedPath ?? nowFilePath).
 */
export type UseFocusDataResult = {
  focus: JsonFocus | null;
  items: JsonItem[] | null;
  error: boolean;
  errorMessage: string | null;
  isLoading: boolean;
  refresh: () => void | Promise<void>;
  applyMutationResult: (result: MutationResult) => Promise<void>;
  setPinnedPath: (path: string | null) => void;
  effectivePath: string | null;
};

/**
 * Options for useFocusData. Used by menu-bar (cache-only when background, use cache when fresh).
 * @property cacheOnly - When true, only read from getFocusCache; do not fetch. For menu bar background launch.
 * @property maxCacheAgeMs - When set (and not cacheOnly), use cache if entry.updatedAt is within this many ms; otherwise fetch.
 */
export type UseFocusDataOptions = {
  cacheOnly?: boolean;
  maxCacheAgeMs?: number;
};

/**
 * Loads focus and items for the active Now file path and exposes refresh/applyMutationResult.
 *
 * **Responsibility**: Single source of focus + items for the list command. Uses {@link useCachedPromise} with {@link fetchFocusData} keyed by effectivePath (pinnedPath ?? nowFilePath). When data arrives, pins the path so the list doesn’t flip when the frontmost app becomes Raycast, and writes to {@link setFocusCache} so the menu bar can show the same state. applyMutationResult updates the cache optimistically and writes to focus cache.
 *
 * **When it updates**: Data and loading state come from useCachedPromise (pathForFetch, execute when effectivePath is set). effectivePath changes when pinnedPath or nowFilePath change. The effect that syncs pinned path and focus cache runs when data?.focus?.key, data?.focus?.focus, data?.focus?.breadcrumb, data?.items?.length, or effectivePath change (primitives to avoid re-runs on unchanged content).
 *
 * **Options** (for menu-bar): cacheOnly — only read from getFocusCache; maxCacheAgeMs — use cache when fresh, else fetch.
 *
 * @param nowFilePath - Currently resolved Now file path (e.g. from useNowPathFromStorage). When null, no fetch runs.
 * @param initialPinnedPath - Optional initial pinned path (e.g. from launch context). When set, effectivePath uses this until the user switches.
 * @param options - Optional. cacheOnly (menu-bar background); maxCacheAgeMs (menu-bar use cache when fresh).
 * @returns UseFocusDataResult
 */
export function useFocusData(
  nowFilePath: string | null,
  initialPinnedPath?: string | null,
  options?: UseFocusDataOptions,
): UseFocusDataResult {
  const cacheOnly = options?.cacheOnly === true;
  const maxCacheAgeMs = options?.maxCacheAgeMs;

  const [pinnedPath, setPinnedPath] = useState<string | null>(initialPinnedPath ?? null);
  const effectivePath = pinnedPath ?? nowFilePath;
  const pathForFetch = effectivePath ?? "";

  const [cacheOnlyData, setCacheOnlyData] = useState<FocusDataResult | null>(null);
  const [cacheOnlyLoading, setCacheOnlyLoading] = useState(true);
  const [cacheCheckDone, setCacheCheckDone] = useState(false);
  const [freshCacheData, setFreshCacheData] = useState<FocusDataResult | null>(null);
  const [hasFreshCache, setHasFreshCache] = useState(false);

  const executeFetch =
    !!effectivePath &&
    (cacheOnly ? false : maxCacheAgeMs != null ? cacheCheckDone && !hasFreshCache : true);

  const { data, error: hookError, isLoading, revalidate, mutate } = useCachedPromise(
    fetchFocusData,
    [pathForFetch],
    {
      execute: executeFetch,
      keepPreviousData: true,
      failureToastOptions: {
        title: "Could not load focus",
        message: "Check path and CLI, then retry.",
      },
    },
  );

  useEffect(() => {
    if (!cacheOnly || !effectivePath) {
      if (cacheOnly) setCacheOnlyLoading(false);
      return;
    }
    let cancelled = false;
    setCacheOnlyLoading(true);
    getFocusCache(effectivePath).then((entry: FocusCacheEntry | null) => {
      if (!cancelled) {
        setCacheOnlyData(entry ? cacheEntryToFocusDataResult(entry) : null);
        setCacheOnlyLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [cacheOnly, effectivePath]);

  useEffect(() => {
    if (cacheOnly || maxCacheAgeMs == null || !effectivePath) return;
    let cancelled = false;
    setCacheCheckDone(false);
    setHasFreshCache(false);
    setFreshCacheData(null);
    getFocusCache(effectivePath).then((entry: FocusCacheEntry | null) => {
      if (cancelled) return;
      setCacheCheckDone(true);
      if (entry && Date.now() - entry.updatedAt < maxCacheAgeMs) {
        setFreshCacheData(cacheEntryToFocusDataResult(entry));
        setHasFreshCache(true);
      } else {
        setHasFreshCache(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [cacheOnly, maxCacheAgeMs, effectivePath]);

  useEffect(() => {
    if (!data?.focus || !effectivePath) return;
    setPinnedPath((prev: string | null) => prev ?? effectivePath);
    void setFocusCache(
      effectivePath,
      data.focus.focus,
      data.focus.breadcrumb,
      data.items ?? undefined,
    );
  }, [
    data?.focus?.key,
    data?.focus?.focus,
    data?.focus?.breadcrumb,
    data?.items?.length,
    effectivePath,
  ]);

  const refreshCacheOnly = useCallback(async () => {
    if (!effectivePath) return;
    const entry = await getFocusCache(effectivePath);
    setCacheOnlyData(entry ? cacheEntryToFocusDataResult(entry) : null);
  }, [effectivePath]);

  const refreshRevalidate = useCallback(() => revalidate(), [revalidate]);

  const applyMutationResultCacheOnly = useCallback(
    async (result: MutationResult) => {
      if (effectivePath) {
        await setFocusCache(
          effectivePath,
          result.focus.focus,
          result.focus.breadcrumb,
          result.items,
        );
        setCacheOnlyData({
          focus: result.focus,
          items: result.items,
          error: false,
          errorMessage: null,
        });
      }
    },
    [effectivePath],
  );

  const applyMutationResultWithMutate = useCallback(
    async (result: MutationResult) => {
      await mutate(Promise.resolve(), {
        optimisticUpdate: (prev: FocusDataResult | undefined): FocusDataResult | undefined =>
          prev
            ? { ...prev, focus: result.focus, items: result.items, error: false, errorMessage: null }
            : prev,
        shouldRevalidateAfter: false,
      });
      if (effectivePath) {
        await setFocusCache(
          effectivePath,
          result.focus.focus,
          result.focus.breadcrumb,
          result.items,
        );
      }
    },
    [effectivePath, mutate],
  );

  const applyMutationResultFreshCache = useCallback(
    async (result: MutationResult) => {
      await mutate(Promise.resolve(), {
        optimisticUpdate: (prev: FocusDataResult | undefined): FocusDataResult | undefined =>
          prev
            ? { ...prev, focus: result.focus, items: result.items, error: false, errorMessage: null }
            : prev,
        shouldRevalidateAfter: false,
      });
      if (effectivePath) {
        await setFocusCache(
          effectivePath,
          result.focus.focus,
          result.focus.breadcrumb,
          result.items,
        );
      }
      setFreshCacheData({
        focus: result.focus,
        items: result.items,
        error: false,
        errorMessage: null,
      });
    },
    [effectivePath, mutate],
  );

  const useCacheOnlyReturn = cacheOnly;
  const useFreshCacheReturn = !cacheOnly && maxCacheAgeMs != null && hasFreshCache && freshCacheData != null;

  const focusFromData = useMemo(
    () => data?.focus ?? null,
    [data?.focus?.key, data?.focus?.focus, data?.focus?.breadcrumb],
  );
  const itemsFromData = useMemo(
    () => data?.items ?? null,
    [data?.items?.length, data?.items?.map((i: JsonItem) => i.key).join(",") ?? ""],
  );

  const focus = useCacheOnlyReturn
    ? (cacheOnlyData?.focus ?? null)
    : useFreshCacheReturn
      ? (freshCacheData?.focus ?? null)
      : focusFromData;
  const items = useCacheOnlyReturn
    ? (cacheOnlyData?.items ?? null)
    : useFreshCacheReturn
      ? (freshCacheData?.items ?? null)
      : itemsFromData;
  const error = useCacheOnlyReturn
    ? (cacheOnlyData?.error ?? false)
    : useFreshCacheReturn
      ? (freshCacheData?.error ?? false)
      : (data?.error ?? false);
  const errorMessage = useCacheOnlyReturn
    ? (cacheOnlyData?.errorMessage ?? null)
    : useFreshCacheReturn
      ? (freshCacheData?.errorMessage ?? null)
      : (data?.errorMessage ?? null);
  const isLoadingValue = useCacheOnlyReturn
    ? cacheOnlyLoading
    : useFreshCacheReturn
      ? false
      : isLoading;
  const refresh = useCacheOnlyReturn ? refreshCacheOnly : refreshRevalidate;
  const applyMutationResult = useCacheOnlyReturn
    ? applyMutationResultCacheOnly
    : useFreshCacheReturn
      ? applyMutationResultFreshCache
      : applyMutationResultWithMutate;

  return {
    focus,
    items,
    error: useCacheOnlyReturn || useFreshCacheReturn ? error : error || !!hookError,
    errorMessage: useCacheOnlyReturn || useFreshCacheReturn ? errorMessage : errorMessage ?? (hookError?.message ?? null),
    isLoading: isLoadingValue,
    refresh,
    applyMutationResult,
    setPinnedPath,
    effectivePath,
  };
}
