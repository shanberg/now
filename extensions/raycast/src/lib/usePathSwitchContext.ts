/**
 * Hook: compute path switch context, label, and list descriptors for list-focus/menu-bar.
 */
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
  const pathSwitchContext = computePathSwitchContext(input);
  const nowInputLabel = pathSwitchContext.contextLabel;
  const pathDescriptorsForList = pathSwitchContextToDescriptors(pathSwitchContext);
  return { pathSwitchContext, nowInputLabel, pathDescriptorsForList };
}
