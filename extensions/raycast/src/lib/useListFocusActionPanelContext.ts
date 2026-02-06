/**
 * Action panel context for list-focus (buildActionPanel input).
 */
import { useMemo } from "react";
import type { ActionPanelContext } from "./listFocusActionPanels";
import type { MutationFormProps } from "./listFocusForms";
import type { PathActionDescriptor } from "./pathContext";
import type { PathSwitchCallbacks } from "./pathSwitchActions";
import type { JsonFocus, JsonItem } from "./now";
import type { MutationResult } from "./now";

export type UseListFocusActionPanelContextArgs = {
  pathForMutations: string;
  focus: JsonFocus | null;
  currentKey: string;
  itemsForMove: JsonItem[];
  applyMutationResult: (result: MutationResult) => Promise<void>;
  refresh: () => void | Promise<void>;
  runNav: (
    fn: () => Promise<MutationResult | null>,
    label: string,
  ) => Promise<void>;
  setSelectedId: (id: string | null) => void;
  pathDescriptorsForList: PathActionDescriptor[];
  pathSwitchCallbacks: PathSwitchCallbacks;
  otherSection: React.ReactNode;
  contextSection: React.ReactNode;
};

export function useListFocusActionPanelContext(
  args: UseListFocusActionPanelContextArgs,
): ActionPanelContext {
  const {
    pathForMutations,
    focus,
    currentKey,
    itemsForMove,
    applyMutationResult,
    refresh,
    runNav,
    setSelectedId,
    pathDescriptorsForList,
    pathSwitchCallbacks,
    otherSection,
    contextSection,
  } = args;

  const mutationFormProps: MutationFormProps = useMemo(
    () => ({
      nowFilePath: pathForMutations,
      applyMutationResult,
      refresh,
    }),
    [pathForMutations, applyMutationResult, refresh],
  );

  return useMemo(
    () => ({
      pathForMutations,
      focus,
      currentKey,
      itemsForMove,
      mutationFormProps,
      applyMutationResult,
      refresh,
      runNav,
      setSelectedId,
      pathDescriptorsForList,
      pathSwitchCallbacks,
      otherSection,
      contextSection,
    }),
    [
      pathForMutations,
      focus,
      currentKey,
      itemsForMove,
      mutationFormProps,
      applyMutationResult,
      refresh,
      runNav,
      setSelectedId,
      pathDescriptorsForList,
      pathSwitchCallbacks,
      otherSection,
      contextSection,
    ],
  );
}
