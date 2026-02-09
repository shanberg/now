/**
 * List-focus section builders and runNav. When called with no args, reads from ListFocusContext.
 */
import { ActionPanel, showToast, Toast } from "@raycast/api";
import { useCallback, type ReactNode } from "react";
import { PathSwitchActionsList } from "./pathSwitchActions";
import type { PathSwitchContext } from "./pathContext";
import type { PathSwitchCallbacks } from "./pathSwitchActions";
import { OtherActionsSection } from "./listFocusActionPanels";
import type { MutationResult } from "./now";
import { useListFocusContext } from "./listFocusContextState";

export type UseListFocusSectionsArgs = {
  hasSwitchOptions: boolean;
  nowInputLabel: string;
  pathSwitchContext: PathSwitchContext;
  pathSwitchCallbacks: PathSwitchCallbacks;
  pathForMutations: string;
  refresh: () => void | Promise<void>;
  applyMutationResult: (result: MutationResult) => Promise<void>;
};

export function useListFocusSections(): {
  contextSection: ReactNode;
  otherSection: ReactNode;
  runNav: (
    fn: () => Promise<MutationResult | null>,
    label: string,
  ) => Promise<void>;
} {
  const ctx = useListFocusContext();
  const hasSwitchOptions = ctx.pathDescriptorsForList.length > 0;
  const {
    nowInputLabel,
    pathSwitchContext,
    pathSwitchCallbacks,
    pathForMutations,
    refresh,
    applyMutationResult,
  } = ctx;

  const contextSection = hasSwitchOptions ? (
    <ActionPanel.Section title={nowInputLabel}>
      <PathSwitchActionsList
        context={pathSwitchContext}
        callbacks={pathSwitchCallbacks}
      />
    </ActionPanel.Section>
  ) : null;

  const otherSection = (
    <>
      {contextSection}
      <OtherActionsSection
        pathForMutations={pathForMutations}
        refresh={refresh}
      />
    </>
  );

  const runNav = useCallback(
    async (fn: () => Promise<MutationResult | null>, label: string) => {
      try {
        const result = await fn();
        if (result) await applyMutationResult(result);
        else await refresh();
        await showToast(Toast.Style.Success, label);
      } catch (e) {
        await showToast(Toast.Style.Failure, label, String(e));
      }
    },
    [applyMutationResult, refresh],
  );

  return { contextSection, otherSection, runNav };
}
