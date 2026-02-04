/**
 * List-focus: ensure watcher running + One Thing sync in one hook.
 */
import { menuBarBackgroundDeeplink } from "./raycastDeeplinks";
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
  effectivePath: string | undefined;
};

export function useListFocusWatcherSync(
  args: UseListFocusWatcherSyncArgs,
): void {
  const menuBarDeeplink = menuBarBackgroundDeeplink();

  useEnsureWatcher(
    args.pathReady,
    args.defaultPath,
    args.appPathsJson,
    args.appSpecificNowFiles,
    args.supportPath,
    args.assetsPath,
    menuBarDeeplink,
  );

  useOneThingSync(args.updateOneThing, args.focusText, args.effectivePath);
}
