/**
 * Shared type and converters for focus data used by useFocusData and useFocusDataCacheState.
 * Keeps cache-entry ↔ FocusDataResult conversion in one place to avoid circular dependencies.
 */
import type { JsonFocus, JsonItem } from "./now";
import type { FocusCacheEntry } from "./focusCache";

export type FocusDataResult = {
  focus: JsonFocus | null;
  items: JsonItem[] | null;
  error: boolean;
  errorMessage: string | null;
};

/** Build JsonFocus from cache entry (menubar only uses focus/breadcrumb; key/isLeaf/isRoot are placeholders). */
export function cacheEntryToJsonFocus(entry: FocusCacheEntry): JsonFocus {
  return {
    key: "",
    focus: entry.focus,
    breadcrumb: entry.breadcrumb,
    isLeaf: true,
    isRoot: false,
  };
}

/** Build FocusDataResult from cache entry for useFocusData return shape. */
export function cacheEntryToFocusDataResult(
  entry: FocusCacheEntry,
): FocusDataResult {
  return {
    focus: cacheEntryToJsonFocus(entry),
    items: entry.items ?? null,
    error: false,
    errorMessage: null,
  };
}
