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
  return "fetch";
}

/** Whether useCachedPromise should run fetch. List: true when path set; menu bar (cacheOnly): false. */
export function shouldExecuteFetch(
  effectivePath: string,
  cacheOnly: boolean,
): boolean {
  return !!effectivePath && !cacheOnly;
}

export function deriveDataSurface(input: DataSurfaceInput): DataSurface {
  const mode = resolveMode(input);
  const dataByMode: Record<DataSourceMode, FocusDataResult | null | undefined> =
    {
      sync_first_paint: input.syncFirstPaint,
      cache_only: input.cacheOnlyData,
      fetch: input.fetchData,
    };
  const currentData = dataByMode[mode];
  const loadingByMode: Record<DataSourceMode, boolean> = {
    sync_first_paint: false,
    cache_only: input.cacheOnlyLoading,
    fetch: input.fetchLoading,
  };
  const fromCacheMode =
    mode === "sync_first_paint" || mode === "cache_only";
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
      : (errorMessageFromData ?? hookError?.message ?? null),
  };
}

export const mutationResultToFocusData = (
  result: MutationResult,
): FocusDataResult => ({
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
  mutate: (
    arg: Promise<void>,
    options: {
      optimisticUpdate: (
        prev: FocusDataResult | undefined,
      ) => FocusDataResult | undefined;
      shouldRevalidateAfter: boolean;
    },
  ) => Promise<unknown>;
  setCacheOnlyData: (data: FocusDataResult) => void;
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
}

/** Apply mutation by mode: cache_only updates local state + cache; fetch uses mutate + cache. */
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
  await applyMutationWithRevalidate(result, effectivePath, opts);
}
