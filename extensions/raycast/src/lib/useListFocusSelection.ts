/**
 * Combines selection id arrays and detail-by-selection for list-focus.
 * Builds selectionIdArrays from path descriptors and items, then runs useDetailBySelection.
 */
import { getSelectionIdArrays } from "./listFocusHelpers";
import type { PathActionDescriptor } from "./pathContext";
import type { JsonFocus, JsonItem } from "./now";
import type { FocusDataResult } from "./useFocusData";
import { useDetailBySelection, type UseDetailBySelectionArgs } from "./listFocusDetail";

export type UseListFocusSelectionArgs = Omit<
  UseDetailBySelectionArgs,
  "selectionIdArrays"
> & {
  pathDescriptorsForList: PathActionDescriptor[];
};

export function useListFocusSelection(
  args: UseListFocusSelectionArgs,
): {
  selectionIdArrays: { listIds: string[]; detailIds: string[] };
  detail: ReturnType<typeof useDetailBySelection>["detail"];
  effectiveSelectedId: string | undefined;
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
  } = args;

  const selectionIdArrays = getSelectionIdArrays(
    pathDescriptorsForList,
    (items ?? []).map((i) => i.key),
    currentKey,
    focus,
  );

  const { detail, effectiveSelectedId } = useDetailBySelection({
    items,
    selectionIdArrays,
    focus,
    currentKey,
    selectedId,
    defaultSelectedActionId,
    defaultPath,
    appPathForCurrent,
    currentApp,
    switchTargetPreviews,
  });

  return { selectionIdArrays, detail, effectiveSelectedId };
}
