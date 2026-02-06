/**
 * Shared constants and pure helpers for list-focus: selection ids, empty view copy, toasts, display.
 */
import { showToast, Toast } from "@raycast/api";
import type { PathActionDescriptor } from "./pathContext";
import type { JsonFocus } from "./now";
import { resolveNowFilePath } from "./now";
import { ACTIONS_SECTION_ITEMS } from "./listFocusConstants";

/** Resolve default focus file path from preferences (shared by list-focus and menu-bar). */
export function getDefaultPath(prefs: { focusFilePath: string }): string {
  return resolveNowFilePath(prefs.focusFilePath);
}

/** Default selection after path switch or mutation. */
export const DEFAULT_SELECTED_ACTION_ID = "action-add";

/** Id for the "Open in Editor" list item (Now File section). */
export const OPEN_EDITOR_ACTION_ID = "action-open-editor";

/** Returns list selection ids (switch section excludes current item) and detail ids (all items). Action ids come from ACTIONS_SECTION_ITEMS (filtered by show(focus)) plus OPEN_EDITOR_ACTION_ID. */
export function getSelectionIdArrays(
  pathDescriptors: PathActionDescriptor[],
  itemKeys: string[],
  currentKey: string,
  focus: JsonFocus | null,
): { listIds: string[]; detailIds: string[] } {
  const actionIds: string[] = [
    ...ACTIONS_SECTION_ITEMS.filter(
      (row) => row.show == null || row.show(focus),
    ).map((row) => row.id),
    OPEN_EDITOR_ACTION_ID,
  ];
  const pathIds = pathDescriptors.map((d) => `action-${d.id}`);
  const baseAndPath = [...actionIds, ...pathIds];
  const listIds = [...baseAndPath, ...itemKeys.filter((k) => k !== currentKey)];
  const detailIds = [...baseAndPath, ...itemKeys];
  return { listIds, detailIds };
}

/** Empty view title and description from state. */
export function getEmptyViewContent(opts: {
  fileMissing: boolean;
  cliMissing: boolean;
  error: boolean;
  errorMessage: string | null | undefined;
  nowInputLabel: string;
}): { title: string; description: string } {
  const { fileMissing, cliMissing, error, errorMessage, nowInputLabel } = opts;
  const description =
    (fileMissing
      ? "Create a new focus file to get started."
      : cliMissing
        ? "Install the now CLI to use this extension."
        : error
          ? (errorMessage ??
            "Check path and format, or run 'now status' in Terminal to see the CLI error.")
          : "Set your focus file path in extension preferences and ensure the now CLI is installed.") +
    `\n\n${nowInputLabel}`;
  const title = fileMissing
    ? "No focus file at path"
    : error
      ? cliMissing
        ? "now CLI not installed"
        : "Could not read focus file"
      : "No focusable items";
  return { title, description };
}

/** Strip trailing " @" from item display for copy title. */
export function trimItemDisplay(display: string): string {
  return display.replace(/\s+@\s*$/, "").trim();
}

/** Show a failure toast with message and stringified error. */
export function showFailureToast(title: string, error: unknown): Promise<void> {
  return showToast(Toast.Style.Failure, title, String(error)).then(() => {});
}

/** Tooltip for empty/error state (e.g. menu bar). */
export function emptyStateTooltip(
  fileMissing: boolean,
  cliMissing: boolean,
  errorMessage: string | null,
): string {
  if (fileMissing) return "No focus file at path";
  if (cliMissing) return "now CLI not installed";
  return errorMessage ?? "Could not read focus file";
}
