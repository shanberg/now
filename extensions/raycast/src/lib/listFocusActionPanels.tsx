/**
 * Action panel building for list-focus: buildActionPanel, OtherActionsSection, EmptyViewActions, context type.
 *
 * Selection is interpreted as: path descriptor (action-{pathId}), item key (move target), or fixed action id.
 * Fixed actions are built from a registry of fragments to avoid a large switch and duplicated JSX.
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
  runAdd,
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
import {
  CREATE_FROM_SEARCH_ID,
  DEFAULT_SELECTED_ACTION_ID,
  OPEN_EDITOR_ACTION_ID,
} from "./listFocusHelpers";
import { showFailureToast, trimItemDisplay } from "./listFocusHelpers";
import { pathActionIcon } from "./pathSwitchActions";

/** Discriminated union for what a selection id represents. */
export type SelectionKind =
  | { kind: "path"; descriptor: PathActionDescriptor }
  | { kind: "item"; item: JsonItem }
  | { kind: "action"; actionId: string };

/** Parses selectionId into path descriptor, item, or fixed action id. */
export function parseSelectionId(
  selectionId: string,
  pathDescriptorsForList: PathActionDescriptor[],
  itemsForMove: JsonItem[],
): SelectionKind {
  const pathDescriptor = pathDescriptorsForList.find(
    (d) => `action-${d.id}` === selectionId,
  );
  if (pathDescriptor) return { kind: "path", descriptor: pathDescriptor };

  const item = itemsForMove.find((i) => i.key === selectionId);
  if (item) return { kind: "item", item };

  return { kind: "action", actionId: selectionId };
}

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
      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
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
              await showToast(Toast.Style.Success, "Focus file created");
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
  /** Typed as unknown to avoid ReactNode type mismatch between project and Raycast API types. */
  actions: unknown;
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
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Raycast types mismatch */
        actions={actions as any}
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
  /** Typed as unknown to avoid ReactNode mismatch between project and Raycast API types. */
  otherSection: unknown;
  /** Typed as unknown to avoid ReactNode mismatch between project and Raycast API types. */
  contextSection: unknown;
  /** Current search bar text; used by create-from-search to run add. */
  searchText?: string;
  /** Clear search after create-from-search add. */
  setSearchText?: (text: string) => void;
};

function panelWithOther(primary: ReactNode, otherSection: unknown): unknown {
  return (
    <ActionPanel>
      {primary}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Raycast types mismatch */}
      {otherSection as any}
    </ActionPanel>
  );
}

/** Reusable primary-action fragments. Each takes context and returns the action(s) for one list row. */
type FragmentFn = (ctx: ActionPanelContext) => ReactNode | null;

const narrowFocusFragment: FragmentFn = ({ mutationFormProps }) => (
  <Action.Push
    title="Narrow Focus"
    icon={Icon.ChevronRight}
    target={<AddNestedForm {...mutationFormProps} />}
  />
);

const diveInFragment: FragmentFn = ({ pathForMutations, runNav, setSelectedId }) => (
  <Action
    title="Dive in"
    icon={Icon.ChevronDown}
    onAction={async () => {
      await runNav(async () => {
        await runDiveIn(pathForMutations);
        return null;
      }, "Dove in");
      setSelectedId(DEFAULT_SELECTED_ACTION_ID);
    }}
  />
);

const completeFragment: FragmentFn = ({ pathForMutations, runNav }) => (
  <Action
    title="Finish This"
    icon={Icon.Checkmark}
    onAction={async () => {
      await runNav(() => runComplete(pathForMutations), "Completed");
    }}
  />
);

const laterFragment: FragmentFn = ({ mutationFormProps }) => (
  <Action.Push
    title="Add Followup"
    icon={Icon.Ellipsis}
    target={<LaterForm {...mutationFormProps} />}
  />
);

const editFragment: FragmentFn = (ctx) =>
  ctx.focus ? (
    <Action.Push
      title="Edit"
      icon={Icon.TextCursor}
      target={
        <EditForm
          {...ctx.mutationFormProps}
          currentName={ctx.focus.focus}
        />
      }
    />
  ) : null;

const wrapFragment: FragmentFn = ({ mutationFormProps }) => (
  <Action.Push
    title="Wrap"
    icon={Icon.ArrowUp}
    target={<WrapForm {...mutationFormProps} />}
  />
);

const moveFragment: FragmentFn = ({
  mutationFormProps,
  currentKey,
  itemsForMove,
}) => (
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
);

const openEditorFragment: FragmentFn = ({ pathForMutations }) => (
  <Action.Open
    title="Open in Editor"
    icon={Icon.Document}
    target={pathForMutations}
  />
);

/** Registry: fixed action id → primary content for the panel. Add new actions here instead of a switch case. */
const ACTION_PANEL_PRIMARY: Record<
  string,
  (ctx: ActionPanelContext) => ReactNode | null
> = {
  "action-add": (ctx) => (
    <>
      {narrowFocusFragment(ctx)}
      {ctx.focus && !ctx.focus.isLeaf ? diveInFragment(ctx) : null}
    </>
  ),
  "action-dive-in": diveInFragment,
  "action-complete": completeFragment,
  "action-later": laterFragment,
  "action-edit": editFragment,
  "action-wrap": wrapFragment,
  "action-move": moveFragment,
  [OPEN_EDITOR_ACTION_ID]: openEditorFragment,
  [CREATE_FROM_SEARCH_ID]: (ctx) => {
    const query = (ctx.searchText ?? "").trim();
    if (!query) return null;
    return (
      <Action
        title="Add"
        icon={Icon.Plus}
        onAction={async () => {
          try {
            const result = await runAdd(ctx.pathForMutations, query);
            if (result) await ctx.applyMutationResult(result);
            else await ctx.refresh();
            await showToast(Toast.Style.Success, "Added");
            ctx.setSelectedId(DEFAULT_SELECTED_ACTION_ID);
            ctx.setSearchText?.("");
          } catch (e) {
            await showFailureToast("Failed to add", e);
          }
        }}
      />
    );
  },
};

function buildPathPanel(
  descriptor: PathActionDescriptor,
  pathSwitchCallbacks: PathSwitchCallbacks,
  otherSection: unknown,
): unknown {
  const onAction = pathSwitchCallbacks[descriptor.id];
  if (!onAction) return null;
  return (
    <ActionPanel>
      <Action
        title={descriptor.title}
        icon={pathActionIcon(descriptor.id)}
        onAction={onAction}
      />
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Raycast types mismatch */}
      {otherSection as any}
    </ActionPanel>
  );
}

function buildItemPanel(ctx: ActionPanelContext, item: JsonItem): unknown {
  const {
    pathForMutations,
    focus,
    currentKey,
    itemsForMove,
    mutationFormProps,
    refresh,
    runNav,
    setSelectedId,
    otherSection,
    contextSection,
  } = ctx;
  const isCurrent = item.key === currentKey;
  return (
    <ActionPanel>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Raycast types mismatch */}
      {contextSection as any}
      <ActionPanel.Section title="Focus">
        <Action
          title="Switch"
          icon={Icon.Star}
          onAction={async () => {
            await runNav(
              () => runSwitch(pathForMutations, item.key),
              "Focus updated",
            );
            setSelectedId(DEFAULT_SELECTED_ACTION_ID);
          }}
        />
        {isCurrent ? (completeFragment(ctx) as any) : null}
      </ActionPanel.Section>
      <ActionPanel.Section title="Actions">
        {(narrowFocusFragment(ctx) as any)}
        {focus && !focus.isLeaf ? (diveInFragment(ctx) as any) : null}
        {(laterFragment(ctx) as any)}
        {(editFragment(ctx) as any)}
        {(wrapFragment(ctx) as any)}
        {(moveFragment(ctx) as any)}
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy">
        <Action.CopyToClipboard
          title="Copy Title"
          content={trimItemDisplay(item.display)}
        />
      </ActionPanel.Section>
      <OtherActionsSection
        pathForMutations={pathForMutations}
        refresh={refresh}
        includePreferences
      />
    </ActionPanel>
  );
}

/** Builds action panel from parsed selection. Parse once at call site (e.g. useActionPanels). */
export function buildActionPanelFromSelection(
  selection: SelectionKind,
  ctx: ActionPanelContext,
): unknown {
  const { pathSwitchCallbacks, otherSection } = ctx;
  switch (selection.kind) {
    case "path":
      return buildPathPanel(
        selection.descriptor,
        pathSwitchCallbacks,
        otherSection,
      );
    case "item":
      return buildItemPanel(ctx, selection.item);
    case "action": {
      const primary = ACTION_PANEL_PRIMARY[selection.actionId]?.(ctx);
      if (primary == null) return null;
      return panelWithOther(primary, otherSection);
    }
    default:
      return null;
  }
}

/** Returns action panel for a selection id (parses then delegates to buildActionPanelFromSelection). */
export function buildActionPanel(
  selectionId: string,
  ctx: ActionPanelContext,
): unknown {
  const selection = parseSelectionId(
    selectionId,
    ctx.pathDescriptorsForList,
    ctx.itemsForMove,
  );
  return buildActionPanelFromSelection(selection, ctx);
}
