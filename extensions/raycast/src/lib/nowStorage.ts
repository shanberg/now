import { LocalStorage } from "@raycast/api";
import {
  NOW_APP_PATHS_KEY,
  NOW_DOCUMENT_PATHS_KEY,
  NOW_LAST_RESOLVED_PATH_KEY,
  NOW_USE_GLOBAL_KEY,
  parseJsonToRecord,
} from "./now";

/**
 * Adds or updates a document → now file path mapping in LocalStorage.
 */
export async function addDocumentPathMapping(
  documentPath: string,
  nowPath: string,
): Promise<void> {
  const existing = await LocalStorage.getItem<string>(NOW_DOCUMENT_PATHS_KEY);
  const map = parseJsonToRecord(existing ?? undefined);
  map[documentPath] = nowPath;
  await LocalStorage.setItem(NOW_DOCUMENT_PATHS_KEY, JSON.stringify(map));
}

/**
 * Adds or updates an app key → now file path mapping in LocalStorage.
 */
export async function addAppPathMapping(
  key: string,
  nowPath: string,
): Promise<void> {
  const existing = await LocalStorage.getItem<string>(NOW_APP_PATHS_KEY);
  const map = parseJsonToRecord(existing ?? undefined);
  map[key] = nowPath;
  await LocalStorage.setItem(NOW_APP_PATHS_KEY, JSON.stringify(map));
}

/**
 * Sets whether to use the global (default) Now file.
 */
export async function setUseGlobal(useGlobal: boolean): Promise<void> {
  await LocalStorage.setItem(NOW_USE_GLOBAL_KEY, useGlobal ? "true" : "false");
}

/**
 * Sets the last resolved now file path (used when app/document resolution fails).
 */
export async function setLastResolvedPath(path: string): Promise<void> {
  await LocalStorage.setItem(NOW_LAST_RESOLVED_PATH_KEY, path);
}
