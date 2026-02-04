/**
 * No-view command that ensures the now-watcher process is running.
 * Scheduled via background refresh so the watcher starts soon after the extension
 * is loaded, without requiring the user to open the menu bar or Focus List first.
 */
import {
  environment,
  getPreferenceValues,
  LaunchType,
  LocalStorage,
} from "@raycast/api";
import { createDeeplink } from "@raycast/utils";

import { NOW_APP_PATHS_KEY, resolveNowFilePath } from "./lib/now";
import {
  collectPathsToWatch,
  ensureWatcherRunning,
} from "./lib/watcherClient";

interface Preferences {
  focusFilePath: string;
  appSpecificNowFiles?: string;
}

export default async function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const defaultPath = prefs.focusFilePath
    ? resolveNowFilePath(prefs.focusFilePath)
    : "";
  const appPathsJson =
    (await LocalStorage.getItem<string>(NOW_APP_PATHS_KEY)) ?? "{}";

  const paths = collectPathsToWatch(
    defaultPath,
    appPathsJson,
    prefs.appSpecificNowFiles,
  );

  ensureWatcherRunning(
    environment.supportPath,
    environment.assetsPath,
    paths,
    createDeeplink({
      command: "menu-bar-focus",
      launchType: LaunchType.Background,
    }),
  );
}
