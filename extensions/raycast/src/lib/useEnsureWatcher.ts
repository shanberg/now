/**
 * Ensures the now-file watcher is running with the given paths and menu-bar deeplink.
 * Used by list-focus so the menu bar can refresh when registered now files change.
 */
import { useEffect } from "react";
import { collectPathsToWatch, ensureWatcherRunning } from "./watcherClient";

export function useEnsureWatcher(
  pathReady: boolean,
  defaultPath: string,
  appPathsJson: string,
  appSpecificNowFiles: string | null | undefined,
  supportPath: string,
  assetsPath: string,
  menuBarDeeplink: string,
): void {
  useEffect(() => {
    if (!pathReady) return;
    const paths = collectPathsToWatch(
      defaultPath,
      appPathsJson,
      appSpecificNowFiles ?? undefined,
    );
    ensureWatcherRunning(supportPath, assetsPath, paths, menuBarDeeplink);
  }, [
    pathReady,
    defaultPath,
    appPathsJson,
    appSpecificNowFiles,
    supportPath,
    assetsPath,
    menuBarDeeplink,
  ]);
}
