/**
 * List-focus: ensure watcher running + One Thing sync in one hook.
 */
import { MENU_BAR_BACKGROUND_DEEPLINK } from "./raycastDeeplinks";
import { useEnsureWatcher } from "./useEnsureWatcher";
import { useOneThingSync } from "./useOneThingSync";

export type UseListFocusWatcherSyncArgs = {
  pathReady: boolean;
  defaultPath: string;
  appPathsJson: string;
  appSpecificNowFiles: string | null | undefined;
  supportPath: string;
  assetsPath: string;
  updateOneThing: boolean | undefined;
  focusText: string | undefined;
};

export function useListFocusWatcherSync(
  args: UseListFocusWatcherSyncArgs,
): void {
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
}
