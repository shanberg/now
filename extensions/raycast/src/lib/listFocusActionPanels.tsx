/**
 * Action panel building for list-focus: buildActionPanel, OtherActionsSection, EmptyViewActions, context type.
 */
import {
  Action,
  ActionPanel,
  Icon,
  List,
  open,
  openCommandPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import type { ReactNode } from "react";
import type { PathActionDescriptor, PathSwitchContext } from "./pathContext";
import { PathSwitchActionsList } from "./pathSwitchActions";
import type { PathSwitchCallbacks } from "./pathSwitchActions";
import {
  createFocusFile,
  runComplete,
  runDiveIn,
  runSwitch,
  NOW_INSTALL_URL,
  openTerminalWithNowStatus,
  openTerminalWithNowTui,
  runNowInstallInTerminal,
  type JsonFocus,
  type JsonItem,
  type MutationResult,
} from "./now";
import {
  AddNestedForm,
  EditForm,
  LaterForm,
  MoveTargetList,
  WrapForm,
  type MutationFormProps,
} from "./listFocusForms";
import { DEFAULT_SELECTED_ACTION_ID, OPEN_EDITOR_ACTION_ID } from "./listFocusHelpers";
import { showFailureToast, trimItemDisplay } from "./listFocusHelpers";
import { pathActionIcon } from "./pathSwitchActions";

/** Shared "Other" actions: Tui, Open in Editor, Refresh; optionally Open Extension Preferences. */
export function OtherActionsSection({
  pathForMutations,
  refresh,
  includePreferences = false,
}: {
  pathForMutations: string;
  refresh: () => void | Promise<void>;
  includePreferences?: boolean;
}) {
  return (
    <ActionPanel.Section title="Other">
      <Action
        title="Tui"
        icon={Icon.Terminal}
        onAction={async () => {
          try {
            await openTerminalWithNowTui(pathForMutations);
            await showToast(Toast.Style.Success, "Terminal opened");
          } catch (e) {
            await showFailureToast("Could not open Terminal", e);
          }
        }}
      />
      <Action.Open
        title="Open in Editor"
        icon={Icon.Document}
        target={pathForMutations}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={refresh}
      />
      {includePreferences ? (
        <Action
          title="Open Extension Preferences"
          onAction={openCommandPreferences}
        />
      ) : null}
    </ActionPanel.Section>
  );
}

export type EmptyViewActionsProps = {
  pathSwitchContext: PathSwitchContext;
  pathSwitchCallbacks: PathSwitchCallbacks;
  fileMissing: boolean;
  cliMissing: boolean;
  error: boolean;
  pathForMutations: string;
  refresh: () => void | Promise<void>;
  applyMutationResult: (result: MutationResult) => Promise<void>;
};

export function EmptyViewActions({
  pathSwitchContext,
  pathSwitchCallbacks,
  fileMissing,
  cliMissing,
  error,
  pathForMutations,
  refresh,
  applyMutationResult,
}: EmptyViewActionsProps) {
  return (
    <ActionPanel>
      <PathSwitchActionsList
        context={pathSwitchContext}
        callbacks={pathSwitchCallbacks}
      />
      {fileMissing ? (
        <Action
          title="Init"
          icon={Icon.Plus}
          onAction={async () => {
            try {
              await createFocusFile(pathForMutations);
              const result = await runSwitch(pathForMutations, "0");
              if (result) await applyMutationResult(result);
              else await refresh();
              await showToast(
                Toast.Style.Success,
                "Focus file created",
              );
              await new Promise((r) => setTimeout(r, 100));
              await refresh();
            } catch (e) {
              await showFailureToast("Failed to create file", e);
            }
          }}
        />
      ) : null}
      {cliMissing === true ? (
        <>
          <Action
            title="Install Now CLI in Terminal"
            icon={Icon.Download}
            onAction={async () => {
              try {
                await runNowInstallInTerminal();
                await showToast(
                  Toast.Style.Success,
                  "Terminal opened — complete install there, then Refresh",
                );
              } catch (e) {
                await showFailureToast("Could not open Terminal", e);
              }
            }}
          />
          <Action
            title="Open Install Instructions in Browser"
            icon={Icon.Globe}
            onAction={() => open(NOW_INSTALL_URL)}
          />
        </>
      ) : error && !fileMissing ? (
        <Action
          title="Status"
          icon={Icon.Terminal}
          onAction={async () => {
            try {
              await openTerminalWithNowStatus(pathForMutations);
              await showToast(
                Toast.Style.Success,
                "Terminal opened — check output, then Refresh",
              );
            } catch (e) {
              await showFailureToast("Could not open Terminal", e);
            }
          }}
        />
      ) : null}
      <OtherActionsSection
        pathForMutations={pathForMutations}
        refresh={refresh}
        includePreferences
      />
    </ActionPanel>
  );
}

export type ListEmptyStateViewProps = {
  isLoading: boolean;
  searchBarPlaceholder: string;
  title: string;
  description: string;
  icon: (typeof Icon)[keyof typeof Icon];
  actions: ReactNode;
};

export function ListEmptyStateView({
  isLoading,
  searchBarPlaceholder,
  title,
  description,
  icon,
  actions,
}: ListEmptyStateViewProps) {
  return (
    <List isLoading={isLoading} searchBarPlaceholder={searchBarPlaceholder}>
      <List.EmptyView
        title={title}
        description={description}
        icon={icon}
        actions={actions}
      />
    </List>
  );
}

/**
 * Everything needed to build an action panel for a given selection id.
 * otherSection/contextSection typed as any to avoid ReactNode mismatch with @raycast/api.
 */
export type ActionPanelContext = {
  pathForMutations: string;
  focus: JsonFocus | null;
  currentKey: string;
  itemsForMove: JsonItem[];
  mutationFormProps: MutationFormProps;
  applyMutationResult: (result: MutationResult) => Promise<void>;
  refresh: () => void | Promise<void>;
  runNav: (
    fn: () => Promise<MutationResult | null>,
    label: string,
  ) => Promise<void>;
  setSelectedId: (id: string | null) => void;
  pathDescriptorsForList: PathActionDescriptor[];
  pathSwitchCallbacks: PathSwitchCallbacks;
  otherSection: any;
  contextSection: any;
};

function panelWithOther(primary: ReactNode, otherSection: any): any {
  return (
    <ActionPanel>
      {primary}
      {otherSection}
    </ActionPanel>
  );
}

/** Returns action panel for a selection id. Typed as any to avoid React/ReactNode mismatch between project and @raycast/api. */
export function buildActionPanel(
  selectionId: string,
  ctx: ActionPanelContext,
): any {
  const {
    pathForMutations,
    focus,
    currentKey,
    itemsForMove,
    mutationFormProps,
    refresh,
    runNav,
    setSelectedId,
    pathDescriptorsForList,
    pathSwitchCallbacks,
    otherSection,
    contextSection,
  } = ctx;

  const pathDescriptor = pathDescriptorsForList.find(
    (d) => `action-${d.id}` === selectionId,
  );
  if (pathDescriptor) {
    const onAction = pathSwitchCallbacks[pathDescriptor.id];
    if (!onAction) return null;
    return (
      <ActionPanel>
        <Action
          title={pathDescriptor.title}
          icon={pathActionIcon(pathDescriptor.id)}
          onAction={onAction}
        />
        {otherSection}
      </ActionPanel>
    ) as unknown as any;
  }

  const itemForKey = itemsForMove.find((i) => i.key === selectionId);
  if (itemForKey) {
    const isCurrent = itemForKey.key === currentKey;
    return (
      <ActionPanel>
        {contextSection}
        <ActionPanel.Section title="Focus">
          <Action
            title="Switch"
            icon={Icon.Star}
            onAction={async () => {
              await runNav(
                () => runSwitch(pathForMutations, itemForKey.key),
                "Focus updated",
              );
              setSelectedId(DEFAULT_SELECTED_ACTION_ID);
            }}
          />
          {isCurrent ? (
            <Action
              title="Finish This"
              icon={Icon.Checkmark}
              onAction={() =>
                runNav(() => runComplete(pathForMutations), "Completed")
              }
            />
          ) : null}
        </ActionPanel.Section>
        <ActionPanel.Section title="Actions">
          <Action.Push
            title="Narrow Focus"
            icon={Icon.ChevronRight}
            target={<AddNestedForm {...mutationFormProps} />}
          />
          {focus && !focus.isLeaf ? (
            <Action
              title="Dive In"
              icon={Icon.ChevronDown}
              onAction={async () => {
                await runNav(async () => {
                  await runDiveIn(pathForMutations);
                  return null;
                }, "Dove in");
                setSelectedId(DEFAULT_SELECTED_ACTION_ID);
              }}
            />
          ) : null}
          <Action.Push
            title="Add Followup"
            icon={Icon.Ellipsis}
            target={<LaterForm {...mutationFormProps} />}
          />
          {focus ? (
            <Action.Push
              title="Edit"
              icon={Icon.TextCursor}
              target={
                <EditForm
                  {...mutationFormProps}
                  currentName={focus.focus}
                />
              }
            />
          ) : null}
          <Action.Push
            title="Wrap"
            icon={Icon.ArrowUp}
            target={<WrapForm {...mutationFormProps} />}
          />
          <Action.Push
            title="Move"
            icon={Icon.ArrowRight}
            target={
              <MoveTargetList
                {...mutationFormProps}
                currentKey={currentKey}
                items={itemsForMove}
              />
            }
          />
        </ActionPanel.Section>
        <ActionPanel.Section title="Copy">
          <Action.CopyToClipboard
            title="Copy Title"
            content={trimItemDisplay(itemForKey.display)}
          />
        </ActionPanel.Section>
        <OtherActionsSection
          pathForMutations={pathForMutations}
          refresh={refresh}
          includePreferences
        />
      </ActionPanel>
    ) as any;
  }

  switch (selectionId) {
    case "action-add":
      return panelWithOther(
        <>
          <Action.Push
            title="Narrow Focus"
            icon={Icon.ChevronRight}
            target={<AddNestedForm {...mutationFormProps} />}
          />
          {focus && !focus.isLeaf ? (
            <Action
              title="Dive In"
              icon={Icon.ChevronDown}
              onAction={async () => {
                await runNav(async () => {
                  await runDiveIn(pathForMutations);
                  return null;
                }, "Dove in");
                setSelectedId(DEFAULT_SELECTED_ACTION_ID);
              }}
            />
          ) : null}
        </>,
        otherSection,
      );
    case "action-dive-in":
      return panelWithOther(
        <Action
          title="Dive In"
          icon={Icon.ChevronDown}
          onAction={async () => {
            await runNav(async () => {
              await runDiveIn(pathForMutations);
              return null;
            }, "Dove in");
            setSelectedId(DEFAULT_SELECTED_ACTION_ID);
          }}
        />,
        otherSection,
      );
    case "action-complete":
      return panelWithOther(
        <Action
          title="Finish This"
          icon={Icon.Checkmark}
          onAction={async () => {
            await runNav(() => runComplete(pathForMutations), "Completed");
          }}
        />,
        otherSection,
      );
    case "action-later":
      return panelWithOther(
        <Action.Push
          title="Add Followup"
          icon={Icon.Ellipsis}
          target={<LaterForm {...mutationFormProps} />}
        />,
        otherSection,
      );
    case "action-edit":
      return focus
        ? panelWithOther(
            <Action.Push
              title="Edit"
              icon={Icon.TextCursor}
              target={
                <EditForm {...mutationFormProps} currentName={focus.focus} />
              }
            />,
            otherSection,
          )
        : null;
    case "action-wrap":
      return panelWithOther(
        <Action.Push
          title="Wrap"
          icon={Icon.ArrowUp}
          target={<WrapForm {...mutationFormProps} />}
        />,
        otherSection,
      );
    case "action-move":
      return panelWithOther(
        <Action.Push
          title="Move"
          icon={Icon.ArrowRight}
          target={
            <MoveTargetList
              {...mutationFormProps}
              currentKey={currentKey}
              items={itemsForMove}
            />
          }
        />,
        otherSection,
      );
    case OPEN_EDITOR_ACTION_ID:
      return panelWithOther(
        <Action.Open
          title="Open in Editor"
          icon={Icon.Document}
          target={pathForMutations}
        />,
        otherSection,
      );
    default:
      return null;
  }
}
