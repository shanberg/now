/**
 * List-focus list UI: loading view, empty view, ListFocusItem, ListFocusListContent.
 */
import { Icon, List } from "@raycast/api";
import { useEffect, type ReactNode } from "react";
import type { PathActionDescriptor, PathSwitchContext } from "./pathContext";
import { pathActionIcon } from "./pathSwitchActions";
import {
  ACTIONS_SECTION_ITEMS,
  LIST_LOADING_DESCRIPTION,
  LIST_LOADING_PLACEHOLDER,
  LIST_LOADING_TITLE,
  type ActionSectionRow,
} from "./listFocusConstants";
import {
  CREATE_FROM_SEARCH_ID,
  getEmptyViewContent,
  OPEN_EDITOR_ACTION_ID,
} from "./listFocusHelpers";
import { EmptyViewActions, ListEmptyStateView } from "./listFocusActionPanels";
import type { PathSwitchCallbacks } from "./pathSwitchActions";
import type { JsonFocus, JsonItem } from "./now";
import type { MutationResult } from "./now";

/** Shown when path is not yet ready (resolving focus file). */
export function ListFocusLoadingView() {
  return (
    <List isLoading searchBarPlaceholder={LIST_LOADING_PLACEHOLDER}>
      <List.EmptyView
        title={LIST_LOADING_TITLE}
        description={LIST_LOADING_DESCRIPTION}
      />
    </List>
  );
}

export type ListFocusEmptyViewProps = {
  isLoading: boolean;
  fileMissing: boolean;
  cliMissing: boolean;
  error: boolean;
  errorMessage: string | null | undefined;
  nowInputLabel: string;
  pathSwitchContext: PathSwitchContext;
  pathSwitchCallbacks: PathSwitchCallbacks;
  pathForMutations: string;
  refresh: () => void | Promise<void>;
  applyMutationResult: (result: MutationResult) => Promise<void>;
};

export function ListFocusEmptyView({
  isLoading,
  fileMissing,
  cliMissing,
  error,
  errorMessage,
  nowInputLabel,
  pathSwitchContext,
  pathSwitchCallbacks,
  pathForMutations,
  refresh,
  applyMutationResult,
}: ListFocusEmptyViewProps) {
  const { title: emptyTitle, description: emptyDescription } =
    getEmptyViewContent({
      fileMissing,
      cliMissing,
      error,
      errorMessage,
      nowInputLabel,
    });
  return (
    <ListEmptyStateView
      isLoading={isLoading}
      searchBarPlaceholder={nowInputLabel}
      title={emptyTitle}
      description={emptyDescription}
      icon={Icon.Warning}
      actions={
        <EmptyViewActions
          pathSwitchContext={pathSwitchContext}
          pathSwitchCallbacks={pathSwitchCallbacks}
          fileMissing={fileMissing}
          cliMissing={cliMissing}
          error={error}
          pathForMutations={pathForMutations}
          refresh={refresh}
          applyMutationResult={applyMutationResult}
        />
      }
    />
  );
}

/** Wraps List.Item with shared detail/actions and eslint-disable for Raycast types. */
export function ListFocusItem({
  id,
  title,
  icon,
  detail,
  actions,
}: {
  id: string;
  title: string;
  icon?: (typeof Icon)[keyof typeof Icon];
  detail: ReactNode;
  actions: ReactNode;
}) {
  return (
    <List.Item
      key={id}
      id={id}
      title={title}
      icon={icon}
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Raycast List.Item uses different React types */
      detail={detail as any}
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Raycast List.Item uses different React types */
      actions={actions as any}
    />
  );
}

export type ListFocusListContentProps = {
  isLoading: boolean;
  nowInputLabel: string;
  effectiveSelectedId: string | undefined;
  onSelectionChange: (id: string | null | undefined) => void;
  onSearchTextChange?: (text: string) => void;
  searchText?: string;
  detail: ReactNode;
  /** Per-id detail for Actions section so panel updates when selecting within Actions. */
  detailBySelection?: Record<string, ReactNode>;
  /** Build detail for a given id at render time (Actions section uses this for correct formatted preview). */
  getDetailForId: (id: string) => ReactNode;
  /** Typed as unknown to avoid ReactNode mismatch between project and Raycast API types. */
  actionPanelsBySelection: Record<string, unknown>;
  pathDescriptorsForList: PathActionDescriptor[];
  items: JsonItem[] | null;
  currentKey: string;
  focus: JsonFocus | null;
  showCreateRow?: boolean;
};

export function ListFocusListContent({
  isLoading,
  nowInputLabel,
  effectiveSelectedId,
  onSelectionChange,
  onSearchTextChange,
  searchText,
  detail,
  detailBySelection,
  getDetailForId,
  actionPanelsBySelection,
  pathDescriptorsForList,
  items,
  currentKey,
  focus,
  showCreateRow = false,
}: ListFocusListContentProps) {
  // #region agent log
  const actionIds = ACTIONS_SECTION_ITEMS.filter(
    (row: ActionSectionRow) => !row.show || row.show(focus),
  ).map((r: ActionSectionRow) => r.id);
  const hasDetailBySelection = detailBySelection != null;
  const sampleActionId = actionIds[0];
  const detailSource =
    sampleActionId != null && detailBySelection?.[sampleActionId] != null
      ? "detailBySelection"
      : "detail";
  useEffect(() => {
    fetch("http://127.0.0.1:7253/ingest/fbc7b931-fa3f-4555-b420-453391a24b98", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "listFocusList.tsx:ListFocusListContent",
        message: "List received props",
        data: {
          effectiveSelectedId,
          hasDetail: !!detail,
          hasDetailBySelection,
          detailSource,
          actionIds: actionIds.slice(0, 3),
        },
        timestamp: Date.now(),
        hypothesisId: "actions-static",
      }),
    }).catch(() => {});
  }, [
    effectiveSelectedId,
    hasDetailBySelection,
    detailSource,
    actionIds.join(","),
  ]);
  // #endregion
  // Key on List forces remount on selection change; can make Raycast show first item's detail instead of selected. Omit key so detail panel follows selection when each item has its own detail (e.g. Actions use detailBySelection).
  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder={nowInputLabel}
      searchText={searchText ?? ""}
      onSearchTextChange={onSearchTextChange}
      filtering={false}
      selectedItemId={effectiveSelectedId}
      onSelectionChange={onSelectionChange}
    >
      {showCreateRow && (searchText ?? "").trim() ? (
        <List.Section title="Create">
          <ListFocusItem
            id={CREATE_FROM_SEARCH_ID}
            title={`Create: ${(searchText ?? "").trim()}`}
            icon={Icon.Plus}
            detail={detail}
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Raycast ReactNode type mismatch */
            actions={actionPanelsBySelection[CREATE_FROM_SEARCH_ID] as any}
          />
        </List.Section>
      ) : null}
      <List.Section title="Actions">
        {ACTIONS_SECTION_ITEMS.filter(
          (row: ActionSectionRow) => !row.show || row.show(focus),
        ).map((row: ActionSectionRow) => (
          <ListFocusItem
            key={row.id}
            id={row.id}
            title={row.title}
            icon={row.icon}
            detail={
              getDetailForId(
                effectiveSelectedId ?? "action-add",
              )
            }
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Raycast ReactNode type mismatch */
            actions={actionPanelsBySelection[row.id] as any}
          />
        ))}
      </List.Section>
      <List.Section title="Now File">
        <ListFocusItem
          id={OPEN_EDITOR_ACTION_ID}
          title="Open in Editor"
          icon={Icon.Document}
          detail={detail}
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Raycast ReactNode type mismatch */
          actions={actionPanelsBySelection[OPEN_EDITOR_ACTION_ID] as any}
        />
        {pathDescriptorsForList.map((d: PathActionDescriptor) => (
          <ListFocusItem
            key={d.id}
            id={`action-${d.id}`}
            title={d.title}
            icon={pathActionIcon(d.id)}
            detail={detail}
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Raycast ReactNode type mismatch */
            actions={actionPanelsBySelection[`action-${d.id}`] as any}
          />
        ))}
      </List.Section>
      <List.Section title="Switch">
        {items
          ?.filter((item) => item.key !== currentKey)
          .filter((item) => {
            const q = (searchText ?? "").trim().toLowerCase();
            if (!q) return true;
            return item.display.trim().toLowerCase().includes(q);
          })
          .map((item) => {
            const isCurrent = item.key === currentKey;
            return (
              <ListFocusItem
                key={item.key}
                id={item.key}
                title={item.display.trim()}
                icon={isCurrent ? Icon.Star : undefined}
                detail={detail}
                /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Raycast ReactNode type mismatch */
                actions={actionPanelsBySelection[item.key] as any}
              />
            );
          })}
      </List.Section>
    </List>
  );
}
