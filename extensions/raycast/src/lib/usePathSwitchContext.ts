/**
 * Hook: compute path switch context, label, and list descriptors for list-focus/menu-bar.
 */
import { useMemo } from "react";
import {
  computePathSwitchContext,
  pathSwitchContextToDescriptors,
  type PathActionDescriptor,
  type PathSwitchContext,
  type PathSwitchContextInput,
} from "./pathContext";

export type UsePathSwitchContextResult = {
  pathSwitchContext: PathSwitchContext;
  nowInputLabel: string;
  pathDescriptorsForList: PathActionDescriptor[];
};

export function usePathSwitchContext(
  input: PathSwitchContextInput,
): UsePathSwitchContextResult {
  const pathSwitchContext = useMemo(
    () => computePathSwitchContext(input),
    [
      input.activePath,
      input.defaultPath,
      input.appPathForCurrent,
      input.currentApp?.bundleId ?? "",
      input.currentApp?.name ?? "",
    ],
  );
  const nowInputLabel = pathSwitchContext.contextLabel;
  const pathDescriptorsForList = useMemo(
    () => pathSwitchContextToDescriptors(pathSwitchContext),
    [pathSwitchContext],
  );
  return { pathSwitchContext, nowInputLabel, pathDescriptorsForList };
}
