/**
 * Combines selection id arrays and detail-by-selection for list-focus.
 * When called with no args, reads from ListFocusContext (use inside ListFocusProvider).
 */
import { useMemo, type ReactNode } from "react";
import {
  getSelectionIdArrays,
  CREATE_FROM_SEARCH_ID,
} from "./listFocusHelpers";
import type { PathActionDescriptor } from "./pathContext";
import type { JsonFocus, JsonItem } from "./now";
import { ACTIONS_SECTION_ITEMS } from "./listFocusConstants";
import {
  useDetailBySelection,
  type UseDetailBySelectionArgs,
} from "./listFocusDetail";
import { useListFocusContext } from "./listFocusContextState";

export type UseListFocusSelectionArgs = Omit<
  UseDetailBySelectionArgs,
  "selectionIdArrays"
> & {
  pathDescriptorsForList: PathActionDescriptor[];
};

function useShowCreateRow(
  items: JsonItem[] | null,
  currentKey: string,
  searchText: string,
): boolean {
  return useMemo(() => {
    const q = (searchText ?? "").trim().toLowerCase();
    if (!q) return false;
    const switchItems = (items ?? []).filter((i) => i.key !== currentKey);
    const hasMatch = switchItems.some((i) =>
      i.display.trim().toLowerCase().includes(q),
    );
    return !hasMatch;
  }, [items, currentKey, searchText]);
}

/** Action section row ids only (for per-item detail so panel updates when selecting within Actions). */
function useActionIdsForDetailMap(focus: JsonFocus | null): string[] {
  return useMemo(
    () =>
      ACTIONS_SECTION_ITEMS.filter(
        (row) => row.show == null || row.show(focus),
      ).map((row) => row.id),
    [focus?.key ?? "", focus?.isLeaf ?? false],
  );
}

export function useListFocusSelection(): {
  selectionIdArrays: { listIds: string[]; detailIds: string[] };
  detail: ReturnType<typeof useDetailBySelection>["detail"];
  detailBySelection: Record<string, ReactNode> | undefined;
  getDetailForId: (id: string) => ReactNode;
  effectiveSelectedId: string | undefined;
  showCreateRow: boolean;
} {
  const ctx = useListFocusContext();
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
  } = ctx;

  const showCreateRow = useShowCreateRow(items, currentKey, searchText ?? "");
  const actionIdsForDetailMap = useActionIdsForDetailMap(focus);

  const itemKeySignature = (items ?? []).map((i: JsonItem) => i.key).join("\n");
  const pathDescriptorSignature = pathDescriptorsForList
    .map((d: PathActionDescriptor) => `${d.id}:${"path" in d ? d.path : ""}`)
    .join("\n");

  const baseSelectionIdArrays = useMemo(
    () =>
      getSelectionIdArrays(
        pathDescriptorsForList,
        (items ?? []).map((i) => i.key),
        currentKey,
        focus,
      ),
    [
      pathDescriptorSignature,
      itemKeySignature,
      currentKey,
      focus?.key ?? "",
      focus?.isLeaf ?? false,
    ],
  );

  const selectionIdArrays = useMemo(
    () =>
      showCreateRow
        ? {
            listIds: [...baseSelectionIdArrays.listIds, CREATE_FROM_SEARCH_ID],
            detailIds: [...baseSelectionIdArrays.detailIds, CREATE_FROM_SEARCH_ID],
          }
        : baseSelectionIdArrays,
    [showCreateRow, baseSelectionIdArrays],
  );

  const { detail, effectiveSelectedId, detailBySelection, getDetailForId } =
    useDetailBySelection({
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
    searchText: searchText ?? "",
    showCreateRow,
    detailIdsForMap: actionIdsForDetailMap,
  });

  return {
    selectionIdArrays,
    detail,
    detailBySelection,
    getDetailForId,
    effectiveSelectedId,
    showCreateRow,
  };
}
