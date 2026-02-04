/**
 * Hook and fetcher for focus + items for a single Now file path.
 *
 * Used by list-focus to load and mutate focus data; writes to focus cache so menu-bar-focus can read the same state.
 * Options cacheOnly and maxCacheAgeMs are for menu-bar usage (cache-only when background, use cache when fresh).
 */
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import { getJsonFocus, getJsonItems, type MutationResult } from "./now";
import type { JsonFocus, JsonItem } from "./now";
import { getFocusCache, getFocusCacheSync, setFocusCache } from "./focusCache";
import {
  cacheEntryToFocusDataResult,
  type FocusDataResult,
} from "./focusDataResult";
import {
  applyMutationResultByMode,
  deriveDataSurface,
  mergeErrorFromSurface,
  shouldExecuteFetch,
  writeFocusCacheFromResult,
} from "./focusDataSurface";
import { useFocusDataCacheState } from "./useFocusDataCacheState";

export type { FocusDataResult } from "./focusDataResult";

/** Sync read for first paint: cache-only always; maxCacheAgeMs only when cache is fresh. Returns null when not applicable. */
function getSyncFirstPaintResult(
  effectivePath: string | null,
  cacheOnly: boolean,
  maxCacheAgeMs: number | undefined,
  cacheCheckDone: boolean,
): FocusDataResult | null {
  if (!effectivePath || cacheCheckDone) return null;
  const entry = getFocusCacheSync(effectivePath);
  if (!entry) return null;
  if (cacheOnly) return cacheEntryToFocusDataResult(entry);
  if (maxCacheAgeMs == null) return null;
  if (Date.now() - entry.updatedAt >= maxCacheAgeMs) return null;
  return cacheEntryToFocusDataResult(entry);
}

type CacheStateSlice = {
  cacheOnlyData: FocusDataResult | null;
  setCacheOnlyData: (v: FocusDataResult | null) => void;
  cacheOnlyLoading: boolean;
  cacheCheckDone: boolean;
  hasFreshCache: boolean;
  freshCacheData: FocusDataResult | null;
  setFreshCacheData: (v: FocusDataResult | null) => void;
};

/** Encapsulates fetch + data-surface resolution so useFocusData stays thin. */
function useFocusDataSurface(
  pathForFetch: string,
  effectivePath: string | null,
  cacheOnly: boolean,
  maxCacheAgeMs: number | undefined,
  cacheState: CacheStateSlice,
) {
  const executeFetch = shouldExecuteFetch(
    pathForFetch,
    cacheOnly,
    maxCacheAgeMs,
    cacheState.cacheCheckDone,
    cacheState.hasFreshCache,
  );

  const {
    data,
    error: hookError,
    isLoading,
    revalidate,
    mutate,
  } = useCachedPromise(fetchFocusData, [pathForFetch], {
    execute: executeFetch,
    keepPreviousData: true,
    failureToastOptions: {
      title: "Could not load focus",
      message: "Check path and CLI, then retry.",
    },
  });

  const syncFirstPaint = getSyncFirstPaintResult(
    effectivePath,
    cacheOnly,
    maxCacheAgeMs,
    cacheState.cacheCheckDone,
  );
  const useSyncFirstPaint = syncFirstPaint != null;

  const dataSurface = deriveDataSurface({
    cacheOnly,
    maxCacheAgeMs,
    cacheCheckDone: cacheState.cacheCheckDone,
    hasFreshCache: cacheState.hasFreshCache,
    freshCacheData: cacheState.freshCacheData,
    syncFirstPaint,
    useSyncFirstPaint,
    cacheOnlyData: cacheState.cacheOnlyData,
    cacheOnlyLoading: cacheState.cacheOnlyLoading,
    fetchData: data,
    fetchLoading: isLoading,
  });

  const refreshCacheOnly = useCallback(async () => {
    if (!effectivePath) return;
    const entry = await getFocusCache(effectivePath);
    cacheState.setCacheOnlyData(
      entry ? cacheEntryToFocusDataResult(entry) : null,
    );
  }, [effectivePath, cacheState.setCacheOnlyData]);

  const refreshRevalidate = useCallback(() => revalidate(), [revalidate]);
  const refresh = dataSurface.useCacheOnlyRefresh
    ? refreshCacheOnly
    : refreshRevalidate;

  return { dataSurface, refresh, mutate, hookError };
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
    errorMessage: bothNull
      ? (focusResult.error ?? itemsResult.error ?? null)
      : null,
  };
}

/**
 * Return value of {@link useFocusData}.
 *
 * **Stable across rerenders** (same reference unless dependencies change): `refresh`, `applyMutationResult`, `setPinnedPath`.
 * **Memoized when source is fetch data**: when the hook uses useCachedPromise result (i.e. not cacheOnly or freshCache mode), `focus` and `items` are memoized by content so unchanged content yields the same reference. In that mode, `error` / `errorMessage` merge useCachedPromise's data error with the hook's `error` (e.g. fetch failure) so both are surfaced.
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

  const [pinnedPath, setPinnedPath] = useState<string | null>(
    initialPinnedPath ?? null,
  );
  const effectivePath = pinnedPath ?? nowFilePath;
  const pathForFetch = effectivePath ?? "";

  const cacheState = useFocusDataCacheState(
    effectivePath,
    cacheOnly,
    maxCacheAgeMs,
  );
  const { dataSurface, refresh, mutate, hookError } = useFocusDataSurface(
    pathForFetch,
    effectivePath,
    cacheOnly,
    maxCacheAgeMs,
    cacheState,
  );

  useEffect(() => {
    const current = dataSurface.currentData;
    if (!current?.focus || !effectivePath) return;
    setPinnedPath((prev: string | null) => prev ?? effectivePath);
    void setFocusCache(
      effectivePath,
      current.focus.focus,
      current.focus.breadcrumb,
      current.items ?? undefined,
    );
  }, [
    dataSurface.currentData?.focus?.key,
    dataSurface.currentData?.focus?.focus,
    dataSurface.currentData?.focus?.breadcrumb,
    dataSurface.currentData?.items?.length,
    dataSurface.currentData?.items?.map((i: JsonItem) => i.key).join(",") ?? "",
    effectivePath,
  ]);

  const applyMutationResult = useCallback(
    (result: MutationResult) =>
      applyMutationResultByMode(result, dataSurface.mode, effectivePath, {
        writeCache: writeFocusCacheFromResult,
        mutate,
        setCacheOnlyData: cacheState.setCacheOnlyData,
        setFreshCacheData: cacheState.setFreshCacheData,
      }),
    [dataSurface.mode, effectivePath, mutate, cacheState.setCacheOnlyData, cacheState.setFreshCacheData],
  );

  const { error, errorMessage } = mergeErrorFromSurface(dataSurface, hookError);

  return {
    focus: dataSurface.currentData?.focus ?? null,
    items: dataSurface.currentData?.items ?? null,
    error,
    errorMessage,
    isLoading: dataSurface.isLoadingValue,
    refresh,
    applyMutationResult,
    setPinnedPath,
    effectivePath,
  };
}
