/**
 * List-focus UI constants: action section rows, loading copy.
 */
import { Icon } from "@raycast/api";
import type { JsonFocus } from "./now";

/** List search bar placeholder when path is resolving. */
export const LIST_LOADING_PLACEHOLDER = "Now";

/** Empty view title when loading focus file. */
export const LIST_LOADING_TITLE = "Loading…";

/** Empty view description when resolving path. */
export const LIST_LOADING_DESCRIPTION = "Resolving focus file…";

export type ActionSectionRow = {
  id: string;
  title: string;
  icon: (typeof Icon)[keyof typeof Icon];
  show?: (focus: JsonFocus | null) => boolean;
};

/** Actions section list rows: id, title, icon; optional show when focus matches. */
export const ACTIONS_SECTION_ITEMS: ActionSectionRow[] = [
  { id: "action-add", title: "Narrow Focus", icon: Icon.ChevronRight },
  {
    id: "action-dive-in",
    title: "Dive In",
    icon: Icon.ChevronDown,
    show: (f) => !!f && !f.isLeaf,
  },
  { id: "action-complete", title: "Finish This", icon: Icon.Checkmark },
  { id: "action-later", title: "Add Followup", icon: Icon.Ellipsis },
  {
    id: "action-edit",
    title: "Edit",
    icon: Icon.TextCursor,
    show: (f) => !!f,
  },
  { id: "action-wrap", title: "Wrap", icon: Icon.ArrowUp },
  { id: "action-move", title: "Move", icon: Icon.ArrowRight },
];
