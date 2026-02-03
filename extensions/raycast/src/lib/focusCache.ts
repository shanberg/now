import { Cache } from "@raycast/api";
import type { JsonItem } from "now-format";

const NOW_FOCUS_CACHE_KEY = "nowFocusCache";

/** Shared cache instance; disk-based with LRU. Shared between list and menu bar commands. */
const focusCache = new Cache({ namespace: "now-focus" });

export type FocusCacheEntry = {
  focus: string;
  breadcrumb: string;
  updatedAt: number;
  items?: JsonItem[];
};

type CacheMap = Record<string, FocusCacheEntry>;

function getCacheMap(): CacheMap {
  const raw = focusCache.get(NOW_FOCUS_CACHE_KEY);
  if (typeof raw !== "string" || !raw.trim() || raw.trim()[0] !== "{") return {};
  try {
    const map = JSON.parse(raw) as CacheMap;
    return map != null && typeof map === "object" ? map : {};
  } catch {
    return {};
  }
}

function setCacheMap(map: CacheMap): void {
  focusCache.set(NOW_FOCUS_CACHE_KEY, JSON.stringify(map));
}

/**
 * Shared focus state between list and menubar. List writes after every
 * refresh/mutation; menubar reads when opened so it shows the same state.
 * Uses Raycast Cache API (disk-based, LRU) for recommended menu bar behavior.
 */
export function getFocusCache(path: string): Promise<FocusCacheEntry | null> {
  const map = getCacheMap();
  const entry = map[path];
  return Promise.resolve(entry != null ? entry : null);
}

export function setFocusCache(
  path: string,
  focus: string,
  breadcrumb: string,
  items?: JsonItem[],
): Promise<void> {
  const map = getCacheMap();
  map[path] = { focus, breadcrumb, updatedAt: Date.now(), ...(items != null && { items }) };
  setCacheMap(map);
  return Promise.resolve();
}
