/**
 * List-focus detail panel: live, formatted preview of the future state implied by the current selection.
 *
 * Contract: the detail view always shows what the list/file would look like if the user
 * confirmed the current selection (including search query when relevant). It is never a
 * cached or unrelated preview. See docs/raycast-list-focus-detail-panel.md.
 *
 * Format is the same as the CLI: we use buildPreviewMarkdown from now-format with the same
 * args as `now json preview` (items, currentKey, breadcrumb, currentItemName, selectedKey, action).
 * To verify: NOW_FILE=/path/to/file.now.md now json preview [--action complete|add|later|edit|wrap|dive-in] [--selected-key KEY]
 */
import { List } from "@raycast/api";
import {
  cloneElement,
  useCallback,
  useMemo,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  buildPreviewMarkdown,
  getBreadcrumbAndNameForKey,
  PREVIEW_ACTION_VALUES,
  type PreviewAction,
} from "now-format";
import type { FocusDataResult } from "./useFocusData";
import type { JsonFocus, JsonItem } from "./now";
import type { PathActionDescriptor } from "./pathContext";
import {
  parseSelectionId,
  type SelectionKind,
} from "./listFocusActionPanels";
import {
  mergeItemsForAddPreview,
  parseNarrowQuery,
} from "./listFocusNarrowQuery";

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
  /** When set and selection is Narrow Focus, detail shows live preview of parsed query. */
  searchText?: string;
  /** When true, "create-from-search" is a valid selection for detail. */
  showCreateRow?: boolean;
};

/** Future state: target file's tree as it would look after switching to that path. */
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

/** Future state: new file with one focus item (state after creating app file). */
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

/**
 * Future state: tree with selected item/action (e.g. after Switch, or with action placeholder).
 * Same buildPreviewMarkdown(...) contract as CLI `now json preview`: selectedKey + action
 * drive ▶/▷/✓/✎ and placeholders (______, wrap, etc.).
 */
/** Normalize keys to string so currentKey/item.key match even when JSON returns numbers. */
function normalizeItemList(items: JsonItem[]): JsonItem[] {
  return items.map((i) => ({ ...i, key: String(i.key) }));
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
  const currentIndex = itemList.findIndex((i) => i.key === currentKey);
  const markdown = buildPreviewMarkdown(
    itemList,
    currentKey,
    previewSource.breadcrumb,
    previewSource.focusName,
    selectedKeyInTree,
    normalizedAction,
    DETAIL_PANEL_BREADCRUMB_MAX_LENGTH,
  );
  // #region agent log
  if (id.startsWith("action-")) {
    const hasPlaceholder = markdown.includes("______");
    const hasCheck = markdown.includes("✓");
    fetch("http://127.0.0.1:7253/ingest/fbc7b931-fa3f-4555-b420-453391a24b98", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "listFocusDetail.tsx:detailForTreeOrAction",
        message: "action detail built",
        data: {
          id,
          normalizedAction,
          selectedKeyInTree,
          currentKey,
          currentIndex,
          itemKeys: itemList.slice(0, 5).map((i) => i.key),
          hasPlaceholder,
          hasCheck,
          markdownSnippet: markdown.slice(0, 200),
        },
        timestamp: Date.now(),
        hypothesisId: "action-preview-content",
      }),
    }).catch(() => {});
  }
  // #endregion
  return <List.Item.Detail markdown={markdown} />;
}

export type UseDetailBySelectionArgs = {
  pathDescriptorsForList: PathActionDescriptor[];
  items: JsonItem[] | null;
  focus: JsonFocus | null;
  currentKey: string;
  selectedId: string | null;
  defaultSelectedActionId: string;
  defaultPath: string;
  appPathForCurrent: string | null;
  currentApp: { name: string; bundleId?: string } | null;
  switchTargetPreviews: Record<string, FocusDataResult>;
  searchText?: string;
  /** When true, "create-from-search" is a valid selection for detail. */
  showCreateRow?: boolean;
  /** When set, also compute and return detail for each id (e.g. Actions section) so each item can show correct detail when selected. */
  detailIdsForMap?: string[];
};

/**
 * Build detail from parsed selection. Every branch returns a live, formatted
 * preview of the future state implied by this selection (see module doc).
 */
export function buildDetailFromSelection(
  selection: SelectionKind,
  ctx: DetailContext,
): ReactNode {
  const { defaultPath, appPathForCurrent, currentApp, switchTargetPreviews } =
    ctx;
  switch (selection.kind) {
    case "path":
      // Future state: target file's tree (state after switching) or new-file preview.
      switch (selection.descriptor.id) {
        case "switch-global":
          return (
            <List.Item.Detail
              markdown={markdownForSwitchTarget(defaultPath, switchTargetPreviews)}
            />
          );
        case "switch-app":
          return appPathForCurrent ? (
            <List.Item.Detail
              markdown={markdownForSwitchTarget(
                appPathForCurrent,
                switchTargetPreviews,
              )}
            />
          ) : null;
        case "create-app":
          return currentApp
            ? detailForCreatePreview(currentApp.name)
            : null;
      }
      break;
    case "item":
      // Future state: tree with this item as focus (state after Switch).
      return detailForTreeOrAction(selection.item.key, ctx);
    case "action": {
      // Future state: use current search query when it affects the preview.
      const query = (ctx.searchText ?? "").trim();
      const isCreateFromSearch = selection.actionId === "create-from-search";
      const isAddWithQuery =
        selection.actionId === "action-add" && query !== "";
      if (isCreateFromSearch) {
        // Future state: create-from-search always reflects current query (or hint when empty).
        if (query === "") {
          const markdown = buildPreviewMarkdown(
            ctx.itemList,
            ctx.currentKey,
            ctx.breadcrumb,
            ctx.currentItemName,
            null,
            null,
            DETAIL_PANEL_BREADCRUMB_MAX_LENGTH,
          );
          return (
            <List.Item.Detail
              markdown={`${markdown}\n\n_Type in the search bar to preview new focus._`}
            />
          );
        }
        const newBranch = parseNarrowQuery(query);
        if (newBranch.length === 0) {
          const markdown = buildPreviewMarkdown(
            ctx.itemList,
            ctx.currentKey,
            ctx.breadcrumb,
            ctx.currentItemName,
            null,
            null,
            DETAIL_PANEL_BREADCRUMB_MAX_LENGTH,
          );
          return (
            <List.Item.Detail
              markdown={`${markdown}\n\n_No valid items parsed from query._`}
            />
          );
        }
        const merged = mergeItemsForAddPreview(
          ctx.itemList,
          ctx.currentKey,
          newBranch,
        );
        const firstNewKey = newBranch[0].key;
        const markdown = buildPreviewMarkdown(
          merged,
          ctx.currentKey,
          ctx.breadcrumb,
          ctx.currentItemName,
          firstNewKey,
          null,
          DETAIL_PANEL_BREADCRUMB_MAX_LENGTH,
        );
        return <List.Item.Detail markdown={markdown} />;
      }
      if (isAddWithQuery) {
        // Future state: Narrow Focus with query = current tree + parsed new branch.
        const newBranch = parseNarrowQuery(query);
        if (newBranch.length === 0)
          return detailForTreeOrAction(selection.actionId, ctx);
        const merged = mergeItemsForAddPreview(
          ctx.itemList,
          ctx.currentKey,
          newBranch,
        );
        const firstNewKey = newBranch[0].key;
        const markdown = buildPreviewMarkdown(
          merged,
          ctx.currentKey,
          ctx.breadcrumb,
          ctx.currentItemName,
          firstNewKey,
          null,
          DETAIL_PANEL_BREADCRUMB_MAX_LENGTH,
        );
        return <List.Item.Detail markdown={markdown} />;
      }
      // Future state: other actions (complete, later, edit, wrap, dive-in, add without query).
      return detailForTreeOrAction(selection.actionId, ctx);
    }
  }
  return null;
}

/** Builds detail node for a given selection id using current context. Used so Actions section can request per-id detail at render time. */
export function buildDetailForSelectionId(
  id: string,
  ctx: DetailContext,
  pathDescriptorsForList: PathActionDescriptor[],
  itemList: JsonItem[],
): ReactNode {
  const parsed = parseSelectionId(id, pathDescriptorsForList, itemList);
  const content = buildDetailFromSelection(parsed, ctx);
  // #region agent log
  if (id.startsWith("action-")) {
    fetch("http://127.0.0.1:7253/ingest/fbc7b931-fa3f-4555-b420-453391a24b98", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "listFocusDetail.tsx:buildDetailForSelectionId",
        message: "getDetailForId called",
        data: {
          id,
          parsedKind: parsed.kind,
          actionId: parsed.kind === "action" ? parsed.actionId : null,
          hasContent: content != null,
        },
        timestamp: Date.now(),
        hypothesisId: "action-preview-content",
      }),
    }).catch(() => {});
  }
  // #endregion
  return content ?? null;
}

export function useDetailBySelection(args: UseDetailBySelectionArgs): {
  detail: ReactNode;
  effectiveSelectedId: string | undefined;
  detailBySelection?: Record<string, ReactNode>;
  /** Build detail for a given id with current context (for Actions section so each row gets correct formatted preview at render time). */
  getDetailForId: (id: string) => ReactNode;
} {
  const {
    pathDescriptorsForList,
    items,
    focus,
    currentKey,
    selectedId,
    defaultSelectedActionId,
    defaultPath,
    appPathForCurrent,
    currentApp,
    switchTargetPreviews,
    searchText,
    showCreateRow,
    detailIdsForMap,
  } = args;

  const itemList = normalizeItemList(items ?? []);
  const keys = new Set(itemList.map((i) => i.key));
  const currentKeyStr = currentKey != null && currentKey !== "" ? String(currentKey) : "";
  const effectiveSelectedId =
    selectedId === "create-from-search" && showCreateRow
      ? "create-from-search"
      : selectedId != null &&
          (selectedId.startsWith("action-") || keys.has(selectedId))
        ? selectedId
        : currentKeyStr && keys.has(currentKeyStr)
          ? currentKeyStr
          : undefined;

  const ctx: DetailContext = {
    itemList,
    keys,
    currentKey: currentKeyStr,
    breadcrumb: focus?.breadcrumb ?? "",
    currentItemName: focus?.focus ?? "",
    defaultPath,
    appPathForCurrent,
    currentApp,
    switchTargetPreviews,
    searchText,
    showCreateRow,
  };

  const selectionForDetail =
    effectiveSelectedId ?? currentKeyStr ?? defaultSelectedActionId;
  const parsed = parseSelectionId(
    selectionForDetail,
    pathDescriptorsForList,
    itemList,
  );
  const defaultParsed = parseSelectionId(
    defaultSelectedActionId,
    pathDescriptorsForList,
    itemList,
  );
  // Primary selection's future-state preview; fallback to default only when primary cannot be rendered.
  const primaryDetail = buildDetailFromSelection(parsed, ctx);
  const detailContent =
    primaryDetail ??
    buildDetailFromSelection(defaultParsed, ctx) ??
    null;
  const usedFallback = !primaryDetail && detailContent != null;
  // #region agent log
  const parsedId =
    parsed.kind === "path"
      ? parsed.descriptor.id
      : parsed.kind === "item"
        ? parsed.item.key
        : parsed.actionId;
  fetch("http://127.0.0.1:7253/ingest/fbc7b931-fa3f-4555-b420-453391a24b98", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "listFocusDetail.tsx:useDetailBySelection",
      message: "detail computed",
      data: {
        selectedId,
        effectiveSelectedId,
        selectionForDetail,
        parsedKind: parsed.kind,
        parsedId,
        usedFallback,
        hasPrimary: !!primaryDetail,
      },
      timestamp: Date.now(),
      hypothesisId: "C_E",
    }),
  }).catch(() => {});
  // #endregion
  // Key forces the detail panel to update when selection or query (for add/create) changes, so placeholders/icons stay in sync.
  const querySensitive =
    parsed.kind === "action" &&
    (parsed.actionId === "action-add" || parsed.actionId === "create-from-search");
  const detailKey = `${selectionForDetail}|${querySensitive ? (searchText ?? "").trim() : ""}`;
  // Pass List.Item.Detail directly so Raycast renders the full markdown preview; wrapping in Fragment can yield a simplified fallback.
  const detail =
    detailContent != null
      ? cloneElement(detailContent as ReactElement, { key: detailKey })
      : null;

  const detailBySelection = useMemo(() => {
    if (!detailIdsForMap?.length) return undefined;
    const map: Record<string, ReactNode> = {};
    const query = (searchText ?? "").trim();
    for (const id of detailIdsForMap) {
      const parsed = parseSelectionId(id, pathDescriptorsForList, itemList);
      const content = buildDetailFromSelection(parsed, ctx);
      const querySensitive =
        parsed.kind === "action" &&
        (parsed.actionId === "action-add" || parsed.actionId === "create-from-search");
      const key = `${id}|${querySensitive ? query : ""}`;
      map[id] =
        content != null
          ? cloneElement(content as ReactElement, { key })
          : null;
    }
    // #region agent log
    fetch("http://127.0.0.1:7253/ingest/fbc7b931-fa3f-4555-b420-453391a24b98", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "listFocusDetail.tsx:detailBySelection",
        message: "detailBySelection built",
        data: {
          keys: Object.keys(map),
          count: Object.keys(map).length,
          detailIdsForMapLength: detailIdsForMap?.length,
        },
        timestamp: Date.now(),
        hypothesisId: "actions-static",
      }),
    }).catch(() => {});
    // #endregion
    return map;
    // Recompute when any input to buildDetailFromSelection changes.
  }, [
    detailIdsForMap?.join(","),
    pathDescriptorsForList,
    itemList,
    currentKey,
    focus?.breadcrumb,
    focus?.focus,
    searchText,
    showCreateRow,
    defaultPath,
    appPathForCurrent,
    currentApp,
    switchTargetPreviews,
  ]);

  const getDetailForId = useCallback(
    (id: string) =>
      buildDetailForSelectionId(
        id,
        ctx,
        pathDescriptorsForList,
        itemList,
      ),
    [
      pathDescriptorsForList,
      itemList,
      currentKey,
      focus?.breadcrumb,
      focus?.focus,
      searchText,
      showCreateRow,
      defaultPath,
      appPathForCurrent,
      currentApp,
      switchTargetPreviews,
    ],
  );

  return { detail, effectiveSelectedId, detailBySelection, getDetailForId };
}
