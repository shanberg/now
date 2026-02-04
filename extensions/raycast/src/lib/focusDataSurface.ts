/**
 * Pure data-surface logic for useFocusData: mode resolution, derive surface, apply mutation.
 * Extracted to reduce cognitive and cyclomatic complexity in the hook.
 */
import { setFocusCache } from "./focusCache";
import type { FocusDataResult } from "./focusDataResult";
import type { MutationResult } from "./now";

export type DataSourceMode =
  | "sync_first_paint"
  | "cache_only"
  | "fresh_cache"
  | "fetch";

export type DataSurface = {
  mode: DataSourceMode;
  currentData: FocusDataResult | null | undefined;
  isLoadingValue: boolean;
  fromCacheMode: boolean;
  useCacheOnlyRefresh: boolean;
};

export type DataSurfaceInput = {
  cacheOnly: boolean;
  maxCacheAgeMs: number | undefined;
  cacheCheckDone: boolean;
  hasFreshCache: boolean;
  freshCacheData: FocusDataResult | null;
  syncFirstPaint: FocusDataResult | null;
  useSyncFirstPaint: boolean;
  cacheOnlyData: FocusDataResult | null;
  cacheOnlyLoading: boolean;
  fetchData: FocusDataResult | undefined;
  fetchLoading: boolean;
};

function resolveMode(input: DataSurfaceInput): DataSourceMode {
  if (input.useSyncFirstPaint) return "sync_first_paint";
  if (input.cacheOnly) return "cache_only";
  if (
    input.maxCacheAgeMs != null &&
    input.hasFreshCache &&
    input.freshCacheData != null
  ) {
    return "fresh_cache";
  }
  return "fetch";
}

/** Whether useCachedPromise should run fetch for the given options and cache state. */
export function shouldExecuteFetch(
  effectivePath: string,
  cacheOnly: boolean,
  maxCacheAgeMs: number | undefined,
  cacheCheckDone: boolean,
  hasFreshCache: boolean,
): boolean {
  if (!effectivePath || cacheOnly) return false;
  if (maxCacheAgeMs != null) return cacheCheckDone && !hasFreshCache;
  return true;
}

export function deriveDataSurface(input: DataSurfaceInput): DataSurface {
  const mode = resolveMode(input);
  const dataByMode: Record<DataSourceMode, FocusDataResult | null | undefined> =
  {
    sync_first_paint: input.syncFirstPaint,
    cache_only: input.cacheOnlyData,
    fresh_cache: input.freshCacheData,
    fetch: input.fetchData,
  };
  const currentData = dataByMode[mode];
  const loadingByMode: Record<DataSourceMode, boolean> = {
    sync_first_paint: false,
    fresh_cache: false,
    cache_only: input.cacheOnlyLoading,
    fetch: input.fetchLoading,
  };
  const fromCacheMode =
    mode === "sync_first_paint" ||
    mode === "cache_only" ||
    mode === "fresh_cache";
  return {
    mode,
    currentData,
    isLoadingValue: loadingByMode[mode],
    fromCacheMode,
    useCacheOnlyRefresh: mode === "cache_only",
  };
}

export function mergeErrorFromSurface(
  dataSurface: DataSurface,
  hookError: Error | undefined,
): { error: boolean; errorMessage: string | null } {
  const errorFromData = dataSurface.currentData?.error ?? false;
  const errorMessageFromData = dataSurface.currentData?.errorMessage ?? null;
  return {
    error: dataSurface.fromCacheMode
      ? errorFromData
      : errorFromData || !!hookError,
    errorMessage: dataSurface.fromCacheMode
      ? errorMessageFromData
      : errorMessageFromData ?? hookError?.message ?? null,
  };
}

export const mutationResultToFocusData = (result: MutationResult): FocusDataResult => ({
  focus: result.focus,
  items: result.items,
  error: false,
  errorMessage: null,
});

/** Writes mutation result to focus cache. Used by all applyMutationResult paths. */
export async function writeFocusCacheFromResult(
  path: string,
  result: MutationResult,
): Promise<void> {
  await setFocusCache(
    path,
    result.focus.focus,
    result.focus.breadcrumb,
    result.items,
  );
}

export type ApplyMutationOpts = {
  writeCache: (path: string, r: MutationResult) => Promise<void>;
  mutate: (arg: Promise<void>, options: {
    optimisticUpdate: (prev: FocusDataResult | undefined) => FocusDataResult | undefined;
    shouldRevalidateAfter: boolean;
  }) => Promise<unknown>;
  setCacheOnlyData: (data: FocusDataResult) => void;
  setFreshCacheData: (data: FocusDataResult) => void;
};

async function applyMutationCacheOnly(
  result: MutationResult,
  effectivePath: string | null,
  opts: ApplyMutationOpts,
): Promise<void> {
  if (effectivePath) await opts.writeCache(effectivePath, result);
  opts.setCacheOnlyData(mutationResultToFocusData(result));
}

async function applyMutationWithRevalidate(
  result: MutationResult,
  mode: DataSourceMode,
  effectivePath: string | null,
  opts: ApplyMutationOpts,
): Promise<void> {
  const optimisticUpdate = (prev: FocusDataResult | undefined) =>
    prev ? mutationResultToFocusData(result) : prev;
  await opts.mutate(Promise.resolve(), {
    optimisticUpdate,
    shouldRevalidateAfter: false,
  });
  if (effectivePath) await opts.writeCache(effectivePath, result);
  if (mode === "fresh_cache") {
    opts.setFreshCacheData(mutationResultToFocusData(result));
  }
}

/** Apply mutation by mode: cache_only updates local state + cache; fresh_cache/fetch use mutate + cache; fresh_cache also updates local cache state. */
export async function applyMutationResultByMode(
  result: MutationResult,
  mode: DataSourceMode,
  effectivePath: string | null,
  opts: ApplyMutationOpts,
): Promise<void> {
  if (mode === "cache_only") {
    await applyMutationCacheOnly(result, effectivePath, opts);
    return;
  }
  if (mode === "fresh_cache" || mode === "fetch") {
    await applyMutationWithRevalidate(result, mode, effectivePath, opts);
  }
}
