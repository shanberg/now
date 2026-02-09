/**
 * Cache-only async read for useFocusData (menu bar). List uses fetch; menu bar uses cache-only.
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

/**
 * Cache-only async read for menu bar. When cacheOnly is true, reads from getFocusCache once per path.
 */
export function useFocusDataCacheState(
  effectivePath: string | null,
  cacheOnly: boolean,
) {
  const [cacheOnlyData, setCacheOnlyData] = useState<FocusDataResult | null>(
    null,
  );
  const [cacheOnlyLoading, setCacheOnlyLoading] = useState(true);

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
  }, [cacheOnly, effectivePath]);

  return {
    cacheOnlyData,
    setCacheOnlyData,
    cacheOnlyLoading,
  };
}
