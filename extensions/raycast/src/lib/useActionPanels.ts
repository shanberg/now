/**
 * Builds the map of action panels by selection id for list-focus.
 * Parses each id once and passes SelectionKind to the panel builder.
 */
import {
  buildActionPanelFromSelection,
  parseSelectionId,
  type ActionPanelContext,
} from "./listFocusActionPanels";

export function useActionPanels(
  allSelectionIds: string[],
  actionPanelContext: ActionPanelContext,
): Record<string, unknown> {
  const map: Record<string, unknown> = {};
  const { pathDescriptorsForList, itemsForMove } = actionPanelContext;
  for (const id of allSelectionIds) {
    const selection = parseSelectionId(id, pathDescriptorsForList, itemsForMove);
    const panel = buildActionPanelFromSelection(selection, actionPanelContext);
    if (panel != null) map[id] = panel;
  }
  return map;
}
