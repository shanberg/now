/**
 * Now CLI integration and path resolution for the Raycast extension.
 * Re-exports from nowCli, nowPathContext, nowSimilarity, nowParse, nowPath, nowTerminal.
 * Owns: storage keys, getOneThingUrl, mergeAppPathsJson, focusFileExists, createFocusFile.
 */
import { existsSync } from "fs";
import { type JsonFocus, type JsonItem } from "now-format";
import { runNow } from "./nowCli";
import { parseJsonToRecord } from "./nowParse";

export type { JsonFocus, JsonItem };
export type { ResolveNowPathResult } from "./nowPathContext";
export type {
  MutationResult,
  GetJsonFocusResult,
  GetJsonItemsResult,
} from "./nowCli";
export {
  getAppPathForCurrentApp,
  resolveNowPathFromContext,
  resolveNowFilePathForApp,
  suggestedNowPathForApp,
} from "./nowPathContext";
export { filenameSimilarity, pathSimilarity } from "./nowSimilarity";
export { parseJsonToRecord } from "./nowParse";
export { resolveNowFilePath } from "./nowPath";
export {
  NOW_INSTALL_SCRIPT_URL,
  openTerminalWithNowStatus,
  openTerminalWithNowTui,
  runNowInstallInTerminal,
} from "./nowTerminal";
export {
  runNow,
  isNowOnPath,
  getPreviewMarkdownForMove,
  getJsonFocus,
  getJsonItems,
  runSwitch,
  runComplete,
  runAdd,
  runLater,
  runEdit,
  runWrap,
  runMove,
  runDiveIn,
  runNext,
  runPrevious,
  runDown,
  runUp,
} from "./nowCli";

/** GitHub repo with install instructions. */
export const NOW_INSTALL_URL = "https://github.com/shanberg/now#installation";

/** URL to update One Thing menu bar app with the given focus text (one-thing:?text=…). */
export function getOneThingUrl(focusText: string): string {
  return `one-thing:?text=${encodeURIComponent(focusText)}`;
}

/** LocalStorage key: when "true", always use the global (default) Now file. */
export const NOW_USE_GLOBAL_KEY = "nowUseGlobal";
/** LocalStorage key: JSON object of app bundleId/name → path for app-specific files (merged with preference). */
export const NOW_APP_PATHS_KEY = "nowAppPaths";
/** LocalStorage key: last resolved now file path (used when app resolution fails so we don't flip to Global). */
export const NOW_LAST_RESOLVED_PATH_KEY = "nowLastResolvedPath";
/** LocalStorage key: menubar-pinned now file path (when set, menubar does not auto-switch file). */
export const NOW_MENUBAR_PINNED_PATH_KEY = "nowMenubarPinnedPath";

/**
 * Merges preference app paths with LocalStorage app paths (local overrides prefs for same key).
 * Returns a JSON string suitable for resolveNowFilePathForApp / getAppPathForCurrentApp.
 */
export function mergeAppPathsJson(
  prefsJson: string | undefined,
  localJson: string | undefined,
): string {
  const prefs = parseJsonToRecord(prefsJson);
  const local = parseJsonToRecord(localJson);
  return JSON.stringify({ ...prefs, ...local });
}

/**
 * Returns true if a file exists at the given path.
 */
export function focusFileExists(nowFilePath: string): boolean {
  return existsSync(nowFilePath);
}

/**
 * Creates the focus file at the given path if missing (via CLI `now init`).
 * Optional rootName (app name) sets the root focus label; empty/whitespace omitted.
 */
export async function createFocusFile(
  nowFilePath: string,
  rootName?: string,
): Promise<void> {
  await runNow(
    nowFilePath,
    "init",
    ...(rootName?.trim() ? [rootName.trim()] : []),
  );
}
