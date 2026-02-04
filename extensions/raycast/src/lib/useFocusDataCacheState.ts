/**
 * Cache-only and fresh-cache async reads for useFocusData.
 * Extracted to keep useFocusData smaller and to separate cache state concerns.
 */
import { useEffect, useState } from "react";
import { getFocusCache, type FocusCacheEntry } from "./focusCache";
import {
  cacheEntryToFocusDataResult,
  type FocusDataResult,
} from "./focusDataResult";

async function readCacheAsResult(
  path: string,
): Promise<FocusDataResult | null> {
  const entry: FocusCacheEntry | null = await getFocusCache(path);
  return entry ? cacheEntryToFocusDataResult(entry) : null;
}

function isEntryFresh(
  entry: FocusCacheEntry | null,
  maxCacheAgeMs: number,
): boolean {
  return entry != null && Date.now() - entry.updatedAt < maxCacheAgeMs;
}

function applyCacheOnlyResult(
  data: FocusDataResult | null,
  setData: (v: FocusDataResult | null) => void,
  setLoading: (v: boolean) => void,
  isCancelled: () => boolean,
): void {
  if (isCancelled()) return;
  setData(data);
  setLoading(false);
}

function applyFreshCheckResult(
  entry: FocusCacheEntry | null,
  maxCacheAgeMs: number,
  setCacheCheckDone: (v: boolean) => void,
  setHasFreshCache: (v: boolean) => void,
  setFreshCacheData: (v: FocusDataResult | null) => void,
  isCancelled: () => boolean,
): void {
  if (isCancelled()) return;
  setCacheCheckDone(true);
  const fresh = isEntryFresh(entry, maxCacheAgeMs);
  setHasFreshCache(fresh);
  if (fresh && entry) {
    setFreshCacheData(cacheEntryToFocusDataResult(entry));
  }
}

function runCacheOnlyFlow(
  path: string,
  setData: (v: FocusDataResult | null) => void,
  setLoading: (v: boolean) => void,
): () => void {
  let cancelled = false;
  setLoading(true);
  readCacheAsResult(path).then((data) =>
    applyCacheOnlyResult(data, setData, setLoading, () => cancelled),
  );
  return () => {
    cancelled = true;
  };
}

function runFreshCheckFlow(
  path: string,
  maxCacheAgeMs: number,
  setCacheCheckDone: (v: boolean) => void,
  setHasFreshCache: (v: boolean) => void,
  setFreshCacheData: (v: FocusDataResult | null) => void,
): () => void {
  let cancelled = false;
  setCacheCheckDone(false);
  setHasFreshCache(false);
  setFreshCacheData(null);
  getFocusCache(path).then((entry: FocusCacheEntry | null) =>
    applyFreshCheckResult(
      entry,
      maxCacheAgeMs,
      setCacheCheckDone,
      setHasFreshCache,
      setFreshCacheData,
      () => cancelled,
    ),
  );
  return () => {
    cancelled = true;
  };
}

/**
 * Encapsulates cache-only and fresh-cache async reads so the main hook has less state and effects.
 * Two flows: (1) cacheOnly: one read for display. (2) maxCacheAgeMs: one read to decide if cache is fresh enough to skip fetch.
 */
export function useFocusDataCacheState(
  effectivePath: string | null,
  cacheOnly: boolean,
  maxCacheAgeMs: number | undefined,
) {
  const [cacheOnlyData, setCacheOnlyData] = useState<FocusDataResult | null>(
    null,
  );
  const [cacheOnlyLoading, setCacheOnlyLoading] = useState(true);
  const [cacheCheckDone, setCacheCheckDone] = useState(false);
  const [freshCacheData, setFreshCacheData] = useState<FocusDataResult | null>(
    null,
  );
  const [hasFreshCache, setHasFreshCache] = useState(false);

  useEffect(() => {
    if (!effectivePath) {
      if (cacheOnly) setCacheOnlyLoading(false);
      return;
    }
    if (cacheOnly) {
      return runCacheOnlyFlow(
        effectivePath,
        setCacheOnlyData,
        setCacheOnlyLoading,
      );
    }
    if (maxCacheAgeMs == null) return;
    return runFreshCheckFlow(
      effectivePath,
      maxCacheAgeMs,
      setCacheCheckDone,
      setHasFreshCache,
      setFreshCacheData,
    );
  }, [cacheOnly, maxCacheAgeMs, effectivePath]);

  return {
    cacheOnlyData,
    setCacheOnlyData,
    cacheOnlyLoading,
    cacheCheckDone,
    freshCacheData,
    setFreshCacheData,
    hasFreshCache,
  };
}
