/**
 * Action panel context for list-focus (buildActionPanel input).
 * Reads path, focus, items, callbacks from ListFocusContext; takes only runNav and section nodes.
 */
import { useMemo } from "react";
import type { ActionPanelContext } from "./listFocusActionPanels";
import type { MutationFormProps } from "./listFocusForms";
import type { MutationResult } from "./now";
import { useListFocusContext } from "./listFocusContextState";

export type UseListFocusActionPanelContextSections = {
  runNav: (
    fn: () => Promise<MutationResult | null>,
    label: string,
  ) => Promise<void>;
  contextSection: React.ReactNode;
  otherSection: React.ReactNode;
};

export function useListFocusActionPanelContext(
  sections: UseListFocusActionPanelContextSections,
): ActionPanelContext {
  const ctx = useListFocusContext();
  const { runNav, contextSection, otherSection } = sections;

  const mutationFormProps: MutationFormProps = useMemo(
    () => ({
      nowFilePath: ctx.pathForMutations,
      applyMutationResult: ctx.applyMutationResult,
      refresh: ctx.refresh,
    }),
    [ctx.pathForMutations, ctx.applyMutationResult, ctx.refresh],
  );

  return useMemo(
    () => ({
      pathForMutations: ctx.pathForMutations,
      focus: ctx.focus,
      currentKey: ctx.currentKey,
      itemsForMove: ctx.itemsForMove,
      mutationFormProps,
      applyMutationResult: ctx.applyMutationResult,
      refresh: ctx.refresh,
      runNav,
      setSelectedId: ctx.setSelectedId,
      pathDescriptorsForList: ctx.pathDescriptorsForList,
      pathSwitchCallbacks: ctx.pathSwitchCallbacks,
      otherSection,
      contextSection,
      searchText: ctx.searchText,
      setSearchText: ctx.setSearchText,
    }),
    [
      ctx.pathForMutations,
      ctx.focus,
      ctx.currentKey,
      ctx.itemsForMove,
      mutationFormProps,
      ctx.applyMutationResult,
      ctx.refresh,
      runNav,
      ctx.setSelectedId,
      ctx.pathDescriptorsForList,
      ctx.pathSwitchCallbacks,
      otherSection,
      contextSection,
      ctx.searchText,
      ctx.setSearchText,
    ],
  );
}
