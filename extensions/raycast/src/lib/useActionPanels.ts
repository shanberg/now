/**
 * Builds the map of action panels by selection id for list-focus.
 */
import {
  buildActionPanel,
  type ActionPanelContext,
} from "./listFocusActionPanels";

export function useActionPanels(
  allSelectionIds: string[],
  actionPanelContext: ActionPanelContext,
): Record<string, unknown> {
  const map: Record<string, unknown> = {};
  for (const id of allSelectionIds) {
    const panel = buildActionPanel(id, actionPanelContext);
    if (panel != null) map[id] = panel;
  }
  return map;
}
