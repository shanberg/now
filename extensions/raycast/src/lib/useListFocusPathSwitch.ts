/**
 * List-focus: path switch context + callbacks in one hook.
 */
import type { PathSwitchContextInput } from "./pathContext";
import { usePathSwitchContext } from "./usePathSwitchContext";
import { usePathSwitchCallbacks, type UsePathSwitchCallbacksArgs } from "./usePathSwitchCallbacks";

export type UseListFocusPathSwitchArgs = PathSwitchContextInput &
  UsePathSwitchCallbacksArgs;

export function useListFocusPathSwitch(
  args: UseListFocusPathSwitchArgs,
): ReturnType<typeof usePathSwitchContext> & {
  pathSwitchCallbacks: ReturnType<typeof usePathSwitchCallbacks>;
} {
  const { pathSwitchContext, nowInputLabel, pathDescriptorsForList } =
    usePathSwitchContext({
      activePath: args.activePath,
      defaultPath: args.defaultPath,
      appPathForCurrent: args.appPathForCurrent,
      currentApp: args.currentApp,
    });

  const pathSwitchCallbacks = usePathSwitchCallbacks({
    defaultPath: args.defaultPath,
    appPathForCurrent: args.appPathForCurrent,
    currentApp: args.currentApp,
    setUseGlobal: args.setUseGlobal,
    setLastResolvedPath: args.setLastResolvedPath,
    refreshPathFromStorage: args.refreshPathFromStorage,
    setPinnedPath: args.setPinnedPath,
    addAppPathMapping: args.addAppPathMapping,
    applyMutationResult: args.applyMutationResult,
    refresh: args.refresh,
    setSelectedId: args.setSelectedId,
  });

  return {
    pathSwitchContext,
    nowInputLabel,
    pathDescriptorsForList,
    pathSwitchCallbacks,
  };
}
