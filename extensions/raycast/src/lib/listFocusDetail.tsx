/**
 * Detail panel helpers for list-focus: markdown for switch targets, tree/action preview.
 */
import { List } from "@raycast/api";
import type { ReactNode } from "react";
import {
  buildPreviewMarkdown,
  getBreadcrumbAndNameForKey,
  PREVIEW_ACTION_VALUES,
  type PreviewAction,
} from "now-format";
import type { FocusDataResult } from "./useFocusData";
import type { JsonFocus, JsonItem } from "./now";

export const DETAIL_PANEL_BREADCRUMB_MAX_LENGTH = 50;

export type DetailContext = {
  itemList: JsonItem[];
  keys: Set<string>;
  currentKey: string;
  breadcrumb: string;
  currentItemName: string;
  defaultPath: string;
  appPathForCurrent: string | null;
  currentApp: { name: string; bundleId?: string } | null;
  switchTargetPreviews: Record<string, FocusDataResult>;
};

export function markdownForSwitchTarget(
  path: string,
  switchTargetPreviews: Record<string, FocusDataResult>,
): string {
  const data = switchTargetPreviews[path];
  if (!data) return "Loading…";
  if (data.error) return data.errorMessage ?? "Could not read focus file.";
  if (data.focus && data.items) {
    return buildPreviewMarkdown(
      data.items,
      data.focus.key,
      data.focus.breadcrumb ?? "",
      data.focus.focus ?? "",
      null,
      null,
      DETAIL_PANEL_BREADCRUMB_MAX_LENGTH,
    );
  }
  return "Loading…";
}

export function detailForCreatePreview(rootName: string): ReactNode {
  const newFileItems: JsonItem[] = [{ display: `${rootName} @`, key: "0" }];
  const markdown = buildPreviewMarkdown(
    newFileItems,
    "0",
    "Focusing on",
    rootName,
    null,
    null,
    DETAIL_PANEL_BREADCRUMB_MAX_LENGTH,
  );
  return <List.Item.Detail markdown={markdown} />;
}

export function parseTreeOrActionSelection(
  id: string,
  keys: Set<string>,
): {
  selectedKeyInTree: string | null;
  normalizedAction: PreviewAction | null;
} {
  const selectedKeyInTree = id.startsWith("action-")
    ? null
    : keys.has(id)
      ? id
      : null;
  const rawAction = id.startsWith("action-") ? id.slice(7) : null;
  const normalizedAction =
    rawAction &&
      PREVIEW_ACTION_VALUES.includes(
        rawAction as (typeof PREVIEW_ACTION_VALUES)[number],
      )
      ? (rawAction as PreviewAction)
      : null;
  return { selectedKeyInTree, normalizedAction };
}

function detailForTreeOrAction(id: string, ctx: DetailContext): ReactNode {
  const { itemList, keys, currentKey, breadcrumb, currentItemName } = ctx;
  const { selectedKeyInTree, normalizedAction } = parseTreeOrActionSelection(
    id,
    keys,
  );
  const isSwitchTarget =
    selectedKeyInTree !== null && selectedKeyInTree !== currentKey;
  const previewSource = isSwitchTarget
    ? getBreadcrumbAndNameForKey(itemList, selectedKeyInTree)
    : { breadcrumb, focusName: currentItemName };
  const markdown = buildPreviewMarkdown(
    itemList,
    currentKey,
    previewSource.breadcrumb,
    previewSource.focusName,
    selectedKeyInTree,
    normalizedAction,
    DETAIL_PANEL_BREADCRUMB_MAX_LENGTH,
  );
  return <List.Item.Detail markdown={markdown} />;
}

export type UseDetailBySelectionArgs = {
  items: JsonItem[] | null;
  focus: JsonFocus | null;
  currentKey: string;
  selectedId: string | null;
  defaultSelectedActionId: string;
  defaultPath: string;
  appPathForCurrent: string | null;
  currentApp: { name: string; bundleId?: string } | null;
  switchTargetPreviews: Record<string, FocusDataResult>;
};

export function useDetailBySelection(args: UseDetailBySelectionArgs): {
  detail: ReactNode;
  effectiveSelectedId: string | undefined;
} {
  const {
    items,
    focus,
    currentKey,
    selectedId,
    defaultSelectedActionId,
    defaultPath,
    appPathForCurrent,
    currentApp,
    switchTargetPreviews,
  } = args;

  const itemKeys = new Set((items ?? []).map((i) => i.key));
  const effectiveSelectedId =
    selectedId != null &&
      (selectedId.startsWith("action-") || itemKeys.has(selectedId))
      ? selectedId
      : currentKey && itemKeys.has(currentKey)
        ? currentKey
        : undefined;

  const itemList = items ?? [];
  const keys = new Set(itemList.map((i) => i.key));
  const ctx: DetailContext = {
    itemList,
    keys,
    currentKey,
    breadcrumb: focus?.breadcrumb ?? "",
    currentItemName: focus?.focus ?? "",
    defaultPath,
    appPathForCurrent,
    currentApp,
    switchTargetPreviews,
  };

  const selectionForDetail =
    effectiveSelectedId ?? currentKey ?? defaultSelectedActionId;
  const detail =
    buildDetailForSelectionId(selectionForDetail, ctx) ??
    buildDetailForSelectionId(defaultSelectedActionId, ctx) ??
    null;

  return { detail, effectiveSelectedId };
}

export function buildDetailForSelectionId(
  id: string,
  ctx: DetailContext,
): ReactNode {
  const { defaultPath, appPathForCurrent, currentApp, switchTargetPreviews } =
    ctx;

  switch (id) {
    case "action-switch-global":
      return (
        <List.Item.Detail
          markdown={markdownForSwitchTarget(defaultPath, switchTargetPreviews)}
        />
      );
    case "action-switch-app":
      return appPathForCurrent ? (
        <List.Item.Detail
          markdown={markdownForSwitchTarget(
            appPathForCurrent,
            switchTargetPreviews,
          )}
        />
      ) : null;
    case "action-create-app":
      return currentApp ? detailForCreatePreview(currentApp.name) : null;
    default:
      return detailForTreeOrAction(id, ctx);
  }
}
