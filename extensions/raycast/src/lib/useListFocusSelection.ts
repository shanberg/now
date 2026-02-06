/**
 * Combines selection id arrays and detail-by-selection for list-focus.
 * Builds selectionIdArrays from path descriptors and items, then runs useDetailBySelection.
 */
import { useMemo } from "react";
import { getSelectionIdArrays } from "./listFocusHelpers";
import type { PathActionDescriptor } from "./pathContext";
import type { JsonItem } from "./now";
import {
  useDetailBySelection,
  type UseDetailBySelectionArgs,
} from "./listFocusDetail";

export type UseListFocusSelectionArgs = Omit<
  UseDetailBySelectionArgs,
  "selectionIdArrays"
> & {
  pathDescriptorsForList: PathActionDescriptor[];
};

export function useListFocusSelection(args: UseListFocusSelectionArgs): {
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

  const itemKeySignature = (items ?? []).map((i: JsonItem) => i.key).join("\n");
  const pathDescriptorSignature = pathDescriptorsForList
    .map((d: PathActionDescriptor) => `${d.id}:${"path" in d ? d.path : ""}`)
    .join("\n");

  const selectionIdArrays = useMemo(
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

  const { detail, effectiveSelectedId } = useDetailBySelection({
    items,
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
