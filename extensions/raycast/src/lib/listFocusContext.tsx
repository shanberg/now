/**
 * List-focus content: reads from ListFocusContext and renders the list.
 * Context and provider live in listFocusContext.ts to avoid circular deps.
 */
import { useCallback, useMemo } from "react";
import { useListFocusContext } from "./listFocusContextState";
import { useListFocusSelection } from "./useListFocusSelection";
import { useListFocusSections } from "./useListFocusSections";
import { useListFocusActionPanelContext } from "./useListFocusActionPanelContext";
import { useActionPanels } from "./useActionPanels";
import { ListFocusListContent } from "./listFocusList";

export type { ListFocusContextValue } from "./listFocusContextState";
export { ListFocusProvider } from "./listFocusContextState";

/**
 * Renders the list content using context. Selection, sections, and action-panel hooks
 * read from ListFocusContext; call only inside ListFocusProvider.
 */
export function ListFocusContent() {
  const ctx = useListFocusContext();

  const {
    selectionIdArrays,
    detail,
    detailBySelection,
    getDetailForId,
    effectiveSelectedId,
    showCreateRow,
  } = useListFocusSelection();

  const handleSelectionChange = useCallback(
    (id: string | null | undefined) => {
      const next = id ?? null;
      // #region agent log
      fetch("http://127.0.0.1:7253/ingest/fbc7b931-fa3f-4555-b420-453391a24b98", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "listFocusContext.tsx:handleSelectionChange",
          message: "onSelectionChange called",
          data: { id, next },
          timestamp: Date.now(),
          hypothesisId: "A",
        }),
      }).catch(() => {});
      // #endregion
      ctx.setSelectedId((prev) => {
        const nextState = prev === next ? prev : next;
        // #region agent log
        fetch("http://127.0.0.1:7253/ingest/fbc7b931-fa3f-4555-b420-453391a24b98", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "listFocusContext.tsx:setSelectedId",
            message: "setSelectedId updater",
            data: { prev, next, nextState, willUpdate: prev !== next },
            timestamp: Date.now(),
            hypothesisId: "B",
          }),
        }).catch(() => {});
        // #endregion
        return nextState;
      });
    },
    [ctx.setSelectedId],
  );

  const { contextSection, otherSection, runNav } = useListFocusSections();

  const actionPanelContext = useListFocusActionPanelContext({
    runNav,
    contextSection,
    otherSection,
  });

  const allSelectionIds = selectionIdArrays.listIds;
  const actionPanelsBySelection = useMemo(
    () => useActionPanels(allSelectionIds, actionPanelContext),
    [allSelectionIds.join("\n"), actionPanelContext],
  );

  return (
    <ListFocusListContent
      isLoading={ctx.isLoading}
      nowInputLabel={ctx.nowInputLabel}
      effectiveSelectedId={effectiveSelectedId}
      onSelectionChange={handleSelectionChange}
      onSearchTextChange={ctx.setSearchText}
      searchText={ctx.searchText}
      detail={detail}
      detailBySelection={detailBySelection}
      getDetailForId={getDetailForId}
      actionPanelsBySelection={actionPanelsBySelection}
      pathDescriptorsForList={ctx.pathDescriptorsForList}
      items={ctx.items}
      currentKey={ctx.currentKey}
      focus={ctx.focus}
      showCreateRow={showCreateRow}
    />
  );
}
