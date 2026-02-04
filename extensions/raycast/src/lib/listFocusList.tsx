/**
 * List-focus list UI: loading view, empty view, ListFocusItem, ListFocusListContent.
 */
import { Icon, List } from "@raycast/api";
import type { ReactNode } from "react";
import type { PathActionDescriptor, PathSwitchContext } from "./pathContext";
import { pathActionIcon } from "./pathSwitchActions";
import {
  ACTIONS_SECTION_ITEMS,
  LIST_LOADING_DESCRIPTION,
  LIST_LOADING_PLACEHOLDER,
  LIST_LOADING_TITLE,
  type ActionSectionRow,
} from "./listFocusConstants";
import { getEmptyViewContent, OPEN_EDITOR_ACTION_ID } from "./listFocusHelpers";
import {
  EmptyViewActions,
  ListEmptyStateView,
} from "./listFocusActionPanels";
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
  detail: ReactNode;
  actionPanelsBySelection: Record<string, ReactNode>;
  pathDescriptorsForList: PathActionDescriptor[];
  items: JsonItem[] | null;
  currentKey: string;
  focus: JsonFocus | null;
};

export function ListFocusListContent({
  isLoading,
  nowInputLabel,
  effectiveSelectedId,
  onSelectionChange,
  detail,
  actionPanelsBySelection,
  pathDescriptorsForList,
  items,
  currentKey,
  focus,
}: ListFocusListContentProps) {
  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder={nowInputLabel}
      selectedItemId={effectiveSelectedId}
      onSelectionChange={onSelectionChange}
    >
      <List.Section title="Actions">
        {ACTIONS_SECTION_ITEMS.filter(
          (row: ActionSectionRow) => !row.show || row.show(focus),
        ).map((row: ActionSectionRow) => (
          <ListFocusItem
            key={row.id}
            id={row.id}
            title={row.title}
            icon={row.icon}
            detail={detail}
            actions={actionPanelsBySelection[row.id]}
          />
        ))}
      </List.Section>
      <List.Section title="Now File">
        <ListFocusItem
          id={OPEN_EDITOR_ACTION_ID}
          title="Open in Editor"
          icon={Icon.Document}
          detail={detail}
          actions={actionPanelsBySelection[OPEN_EDITOR_ACTION_ID]}
        />
        {pathDescriptorsForList.map((d: PathActionDescriptor) => (
          <ListFocusItem
            key={d.id}
            id={`action-${d.id}`}
            title={d.title}
            icon={pathActionIcon(d.id)}
            detail={detail}
            actions={actionPanelsBySelection[`action-${d.id}`]}
          />
        ))}
      </List.Section>
      <List.Section title="Switch">
        {items
          ?.filter((item) => item.key !== currentKey)
          .map((item) => {
            const isCurrent = item.key === currentKey;
            return (
              <ListFocusItem
                key={item.key}
                id={item.key}
                title={item.display.trim()}
                icon={isCurrent ? Icon.Star : undefined}
                detail={detail}
                actions={actionPanelsBySelection[item.key]}
              />
            );
          })}
      </List.Section>
    </List>
  );
}
