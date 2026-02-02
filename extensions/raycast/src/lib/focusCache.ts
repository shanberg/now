import { LocalStorage } from "@raycast/api";
import type { JsonItem } from "now-format";

const NOW_FOCUS_CACHE_KEY = "nowFocusCache";

export type FocusCacheEntry = {
  focus: string;
  breadcrumb: string;
  updatedAt: number;
  items?: JsonItem[];
};

type CacheMap = Record<string, FocusCacheEntry>;

async function getCacheMap(): Promise<CacheMap> {
  const raw = await LocalStorage.getItem<string>(NOW_FOCUS_CACHE_KEY);
  if (!raw?.trim()) return {};
  try {
    const map = JSON.parse(raw) as CacheMap;
    return map != null && typeof map === "object" ? map : {};
  } catch {
    return {};
  }
}

async function setCacheMap(map: CacheMap): Promise<void> {
  await LocalStorage.setItem(NOW_FOCUS_CACHE_KEY, JSON.stringify(map));
}

/**
 * Shared focus state between list and menubar. List writes after every
 * refresh/mutation; menubar reads when opened so it shows the same state.
 */
export async function getFocusCache(path: string): Promise<FocusCacheEntry | null> {
  const map = await getCacheMap();
  const entry = map[path];
  return entry != null ? entry : null;
}

export async function setFocusCache(
  path: string,
  focus: string,
  breadcrumb: string,
  items?: JsonItem[],
): Promise<void> {
  // #region agent log
  fetch("http://127.0.0.1:7253/ingest/fbc7b931-fa3f-4555-b420-453391a24b98", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "focusCache.ts:setFocusCache",
      message: "setFocusCache write",
      data: { path, focusSnippet: focus.slice(0, 60), hypothesisId: "A,B" },
      timestamp: Date.now(),
      sessionId: "debug-session",
    }),
  }).catch(() => {});
  // #endregion
  const map = await getCacheMap();
  map[path] = { focus, breadcrumb, updatedAt: Date.now(), ...(items != null && { items }) };
  await setCacheMap(map);
}
