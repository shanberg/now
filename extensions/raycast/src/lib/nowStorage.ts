/**
 * LocalStorage helpers for path-resolution state used by useNowPathFromStorage.
 * Persists useGlobal, app path mappings, and lastResolvedPath so list and menu bar stay in sync.
 */
import { LocalStorage } from "@raycast/api";
import {
  NOW_APP_PATHS_KEY,
  NOW_LAST_RESOLVED_PATH_KEY,
  NOW_USE_GLOBAL_KEY,
  parseJsonToRecord,
} from "./now";

/** Mutates the map in place; used to add/update one entry before persisting. */
export type StorageMapUpdater = (map: Record<string, string>) => void;

/** Writes a string value to LocalStorage at key. */
async function setStorageString(key: string, value: string): Promise<void> {
  await LocalStorage.setItem(key, value);
}

/**
 * Reads the JSON map at key, runs updater(map), then writes back.
 * Used by addPathMapping.
 */
async function updateStorageMap(
  key: string,
  updater: StorageMapUpdater,
): Promise<void> {
  const existing = await LocalStorage.getItem<string>(key);
  const map = parseJsonToRecord(existing ?? undefined);
  updater(map);
  await LocalStorage.setItem(key, JSON.stringify(map));
}

async function addPathMapping(
  storageKey: string,
  entryKey: string,
  nowPath: string,
): Promise<void> {
  await updateStorageMap(storageKey, (map) => {
    map[entryKey] = nowPath;
  });
}

/**
 * Adds or updates an app key → now file path mapping in LocalStorage.
 */
export async function addAppPathMapping(
  key: string,
  nowPath: string,
): Promise<void> {
  await addPathMapping(NOW_APP_PATHS_KEY, key, nowPath);
}

/**
 * Sets whether to use the global (default) Now file.
 */
export async function setUseGlobal(useGlobal: boolean): Promise<void> {
  await setStorageString(NOW_USE_GLOBAL_KEY, useGlobal ? "true" : "false");
}

/**
 * Sets the last resolved now file path (used when app resolution fails).
 */
export async function setLastResolvedPath(path: string): Promise<void> {
  await setStorageString(NOW_LAST_RESOLVED_PATH_KEY, path);
}
