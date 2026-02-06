/**
 * Menu-bar: watcher ensure + One Thing sync + dirty file sync in one hook.
 */
import { MENU_BAR_BACKGROUND_DEEPLINK } from "./raycastDeeplinks";
import { useEnsureWatcher } from "./useEnsureWatcher";
import { useMenubarDirtyFileSync } from "./useMenubarDirtyFileSync";
import { useOneThingSync } from "./useOneThingSync";

export type UseMenubarWatcherSyncArgs = {
  pathReady: boolean;
  defaultPath: string;
  appPathsJson: string;
  appSpecificNowFiles: string | null | undefined;
  supportPath: string;
  assetsPath: string;
  updateOneThing: boolean | undefined;
  focusText: string | undefined;
  refreshPathFromStorage: () => Promise<void>;
  refreshPathFromStorageWithApp: (app: {
    bundleId?: string;
    name: string;
  }) => Promise<void>;
  refresh: () => void | Promise<void>;
};

export function useMenubarWatcherSync(args: UseMenubarWatcherSyncArgs): void {
  useEnsureWatcher(
    args.pathReady,
    args.defaultPath,
    args.appPathsJson,
    args.appSpecificNowFiles,
    args.supportPath,
    args.assetsPath,
    MENU_BAR_BACKGROUND_DEEPLINK,
  );

  useOneThingSync(args.updateOneThing, args.focusText);

  useMenubarDirtyFileSync({
    pathReady: args.pathReady,
    supportPath: args.supportPath,
    refreshPathFromStorage: args.refreshPathFromStorage,
    refreshPathFromStorageWithApp: args.refreshPathFromStorageWithApp,
    refresh: args.refresh,
  });
}
