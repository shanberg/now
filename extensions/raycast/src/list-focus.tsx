import {
  Action,
  ActionPanel,
  environment,
  Form,
  getPreferenceValues,
  Icon,
  LaunchType,
  List,
  open,
  openCommandPreferences,
  showToast,
  Toast,
  useNavigation,
  type LaunchProps,
} from "@raycast/api";
import { createDeeplink } from "@raycast/utils";
import {
  useCallback,
  useEffect,
  memo,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  computePathSwitchContext,
  pathSwitchContextSwitchTargetPaths,
  pathSwitchContextToDescriptors,
  type PathActionDescriptor,
} from "./lib/pathContext";
import {
  PathSwitchActionsList,
  type PathSwitchCallbacks,
} from "./lib/pathSwitchActions";
import {
  createFocusFile,
  focusFileExists,
  JsonFocus,
  JsonItem,
  type MutationResult,
  NOW_INSTALL_URL,
  openTerminalWithNowStatus,
  openTerminalWithNowTui,
  getOneThingUrl,
  documentDisplayName,
  resolveNowFilePath,
  runAdd,
  suggestedNowPathForApp,
  suggestedNowPathForDocument,
  runComplete,
  runDiveIn,
  runEdit,
  runLater,
  getPreviewMarkdownForMove,
  runMove,
  runNowInstallInTerminal,
  runSwitch,
  runWrap,
} from "./lib/now";
import { useCliMissing } from "./lib/useCliMissing";
import {
  fetchFocusData,
  useFocusData,
  type FocusDataResult,
} from "./lib/useFocusData";
import { useNowPathFromStorage } from "./lib/useNowPath";
import { collectPathsToWatch, ensureWatcherRunning } from "./lib/watcherClient";
import {
  buildPreviewMarkdown,
  getBreadcrumbAndNameForKey,
  PREVIEW_ACTION_VALUES,
  type PreviewAction,
} from "now-format";

/** Detail panel always truncates breadcrumb to this length. */
const DETAIL_PANEL_BREADCRUMB_MAX_LENGTH = 50;

/** List no longer opens the menubar after mutations; that caused extension reload. Menubar reads from focus cache when opened. */
interface Preferences {
  focusFilePath: string;
  updateOneThing?: boolean;
  appSpecificNowFiles?: string;
  breadcrumbMaxLength?: string;
}

function AddNestedForm({
  nowFilePath,
  applyMutationResult,
  refresh,
}: {
  nowFilePath: string;
  applyMutationResult: (result: MutationResult) => Promise<void>;
  refresh: () => void | Promise<void>;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add"
            icon={Icon.Plus}
            onSubmit={async (values: { items: string }) => {
              const items = (values.items ?? "").trim();
              if (!items) {
                await showToast(Toast.Style.Failure, "Enter at least one item");
                return;
              }
              try {
                const result = await runAdd(nowFilePath, items);
                if (result) await applyMutationResult(result);
                else await refresh();
                await showToast(Toast.Style.Success, "Added");
                pop();
              } catch (e) {
                await showToast(Toast.Style.Failure, "Failed", String(e));
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="items"
        title="Items"
        placeholder="Item 1, Item 2 / Sub"
        info="Comma-separated or use / for nesting"
      />
    </Form>
  );
}

function LaterForm({
  nowFilePath,
  applyMutationResult,
  refresh,
}: {
  nowFilePath: string;
  applyMutationResult: (result: MutationResult) => Promise<void>;
  refresh: () => void | Promise<void>;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Later"
            icon={Icon.Plus}
            onSubmit={async (values: { items: string }) => {
              const items = (values.items ?? "").trim();
              if (!items) {
                await showToast(Toast.Style.Failure, "Enter at least one item");
                return;
              }
              try {
                const result = await runLater(nowFilePath, items);
                if (result) await applyMutationResult(result);
                else await refresh();
                await showToast(Toast.Style.Success, "Added");
                pop();
              } catch (e) {
                await showToast(Toast.Style.Failure, "Failed", String(e));
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="items"
        title="Items"
        placeholder="Item 1, Item 2 / Sub"
        info="Comma-separated or use / for nesting (follow-up siblings)"
      />
    </Form>
  );
}

function EditForm({
  nowFilePath,
  currentName,
  applyMutationResult,
  refresh,
}: {
  nowFilePath: string;
  currentName: string;
  applyMutationResult: (result: MutationResult) => Promise<void>;
  refresh: () => void | Promise<void>;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Edit"
            icon={Icon.TextCursor}
            onSubmit={async (values: { newName: string }) => {
              const newName = (values.newName ?? "").trim();
              if (!newName) {
                await showToast(Toast.Style.Failure, "Enter a name");
                return;
              }
              try {
                const result = await runEdit(nowFilePath, newName);
                if (result) await applyMutationResult(result);
                else await refresh();
                await showToast(Toast.Style.Success, "Updated");
                pop();
              } catch (e) {
                await showToast(Toast.Style.Failure, "Failed", String(e));
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="newName"
        title="New name"
        info="Edit the current focus description"
        defaultValue={currentName}
        placeholder="Focus description"
      />
    </Form>
  );
}

function WrapForm({
  nowFilePath,
  applyMutationResult,
  refresh,
}: {
  nowFilePath: string;
  applyMutationResult: (result: MutationResult) => Promise<void>;
  refresh: () => void | Promise<void>;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Wrap"
            icon={Icon.ArrowUp}
            onSubmit={async (values: { parentName: string }) => {
              const parentName = (values.parentName ?? "").trim();
              if (!parentName) {
                await showToast(Toast.Style.Failure, "Enter parent name");
                return;
              }
              try {
                const result = await runWrap(nowFilePath, parentName);
                if (result) await applyMutationResult(result);
                else await refresh();
                await showToast(Toast.Style.Success, "Wrapped");
                pop();
              } catch (e) {
                await showToast(Toast.Style.Failure, "Failed", String(e));
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="parentName"
        title="New parent name"
        placeholder="Parent focus"
      />
    </Form>
  );
}

function MoveTargetListInner({
  nowFilePath,
  currentKey,
  items,
  applyMutationResult,
  refresh,
}: {
  nowFilePath: string;
  currentKey: string;
  items: JsonItem[];
  applyMutationResult: (result: MutationResult) => Promise<void>;
  refresh: () => void | Promise<void>;
}) {
  const { pop } = useNavigation();
  const targets = items.filter((item) => item.key !== currentKey);
  const [selectedTargetKey, setSelectedTargetKey] = useState<string | null>(
    null,
  );
  const [movePreviewCache, setMovePreviewCache] = useState<
    Record<string, string>
  >({});
  const [lastShownMarkdown, setLastShownMarkdown] = useState<string>("");
  const preloadStartedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (targets.length > 0 && selectedTargetKey === null) {
      setSelectedTargetKey(targets[0].key);
    }
  }, [targets, selectedTargetKey]);

  useEffect(() => {
    const toPreload = targets.slice(0, 5).map((item) => item.key);
    toPreload.forEach((key) => {
      if (preloadStartedRef.current.has(key)) return;
      preloadStartedRef.current.add(key);
      getPreviewMarkdownForMove(nowFilePath, key).then((md) => {
        setMovePreviewCache((prev) => ({ ...prev, [key]: md }));
      });
    });
  }, [targets, nowFilePath]);

  /** Depend on the cached value for the selected key (primitive) so the effect only runs when selection or that key's cache entry changes, not when any other key is added to movePreviewCache. */
  const cachedMarkdownForSelected = selectedTargetKey
    ? movePreviewCache[selectedTargetKey]
    : undefined;
  useEffect(() => {
    if (!selectedTargetKey) return;
    if (cachedMarkdownForSelected !== undefined) {
      setLastShownMarkdown(cachedMarkdownForSelected);
      return;
    }
    let cancelled = false;
    getPreviewMarkdownForMove(nowFilePath, selectedTargetKey).then((md) => {
      if (!cancelled) {
        setMovePreviewCache((prev) => ({ ...prev, [selectedTargetKey]: md }));
        setLastShownMarkdown(md);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [nowFilePath, selectedTargetKey, cachedMarkdownForSelected]);

  return (
    <List
      navigationTitle="Move to…"
      searchBarPlaceholder="Select new parent"
      isShowingDetail
      selectedItemId={selectedTargetKey ?? targets[0]?.key ?? undefined}
      onSelectionChange={(id) => setSelectedTargetKey(id ?? null)}
    >
      {targets.map((item) => {
        const markdown =
          movePreviewCache[item.key] ??
          (selectedTargetKey === item.key ? lastShownMarkdown : null);
        return (
          <List.Item
            key={item.key}
            id={item.key}
            title={item.display.trim()}
            detail={
              <List.Item.Detail
                markdown={
                  markdown ??
                  "Select a target to preview the tree after the move."
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Move Here"
                  icon={Icon.ArrowRight}
                  onAction={async () => {
                    try {
                      const result = await runMove(nowFilePath, item.key);
                      if (result) await applyMutationResult(result);
                      else await refresh();
                      await showToast(Toast.Style.Success, "Moved");
                      pop();
                    } catch (e) {
                      await showToast(Toast.Style.Failure, "Failed", String(e));
                    }
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

const MoveTargetList = memo(MoveTargetListInner);

/** Everything needed to build an action panel for a given selection id. Used by a single factory so we have one useMemo for all panels. otherSection/contextSection typed as any to avoid ReactNode mismatch with @raycast/api. */
type ActionPanelContext = {
  pathForMutations: string;
  focus: JsonFocus | null;
  currentKey: string;
  itemsForMove: JsonItem[];
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

/** Returns action panel for a selection id. Typed as any to avoid React/ReactNode mismatch between project and @raycast/api. */
function buildActionPanel(
  selectionId: string,
  ctx: ActionPanelContext,
): any {
  const {
    pathForMutations,
    focus,
    currentKey,
    itemsForMove,
    applyMutationResult,
    refresh,
    runNav,
    setSelectedId,
    pathDescriptorsForList,
    pathSwitchCallbacks,
    otherSection,
    contextSection,
  } = ctx;

  const iconForPathId = (id: PathActionDescriptor["id"]) => {
    switch (id) {
      case "switch-global":
        return Icon.Circle;
      case "switch-document":
        return Icon.Document;
      case "switch-app":
        return Icon.AppWindow;
      case "create-document":
      case "create-app":
        return Icon.Plus;
    }
  };

  // Path switch/create actions (action-{pathId})
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
          icon={iconForPathId(pathDescriptor.id)}
          onAction={onAction}
        />
        {otherSection}
      </ActionPanel>
    ) as unknown as any;
  }

  // Switch section: item key (tree node)
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
              try {
                const result = await runSwitch(pathForMutations, itemForKey.key);
                if (result) await applyMutationResult(result);
                else await refresh();
                await showToast(Toast.Style.Success, "Focus updated");
                setSelectedId("action-add");
              } catch (e) {
                await showToast(
                  Toast.Style.Failure,
                  "Failed to set focus",
                  String(e),
                );
              }
            }}
          />
          {isCurrent ? (
            <Action
              title="Finish This"
              icon={Icon.Checkmark}
              onAction={async () => {
                try {
                  const result = await runComplete(pathForMutations);
                  if (result) await applyMutationResult(result);
                  else await refresh();
                  await showToast(Toast.Style.Success, "Completed");
                } catch (e) {
                  await showToast(
                    Toast.Style.Failure,
                    "Failed to complete",
                    String(e),
                  );
                }
              }}
            />
          ) : null}
        </ActionPanel.Section>
        <ActionPanel.Section title="Actions">
          <Action.Push
            title="Narrow Focus"
            icon={Icon.ChevronRight}
            target={
              <AddNestedForm
                nowFilePath={pathForMutations}
                applyMutationResult={applyMutationResult}
                refresh={refresh}
              />
            }
          />
          {focus && !focus.isLeaf ? (
            <Action
              title="Dive In"
              icon={Icon.ChevronDown}
              onAction={async () => {
                try {
                  await runDiveIn(pathForMutations);
                  await refresh();
                  await showToast(Toast.Style.Success, "Dove in");
                  setSelectedId("action-add");
                } catch (e) {
                  await showToast(
                    Toast.Style.Failure,
                    "Dive in failed",
                    String(e),
                  );
                }
              }}
            />
          ) : null}
          <Action.Push
            title="Add Followup"
            icon={Icon.Ellipsis}
            target={
              <LaterForm
                nowFilePath={pathForMutations}
                applyMutationResult={applyMutationResult}
                refresh={refresh}
              />
            }
          />
          {focus ? (
            <Action.Push
              title="Edit"
              icon={Icon.TextCursor}
              target={
                <EditForm
                  nowFilePath={pathForMutations}
                  currentName={focus.focus}
                  applyMutationResult={applyMutationResult}
                  refresh={refresh}
                />
              }
            />
          ) : null}
          <Action.Push
            title="Wrap"
            icon={Icon.ArrowUp}
            target={
              <WrapForm
                nowFilePath={pathForMutations}
                applyMutationResult={applyMutationResult}
                refresh={refresh}
              />
            }
          />
          <Action.Push
            title="Move"
            icon={Icon.ArrowRight}
            target={
              <MoveTargetList
                nowFilePath={pathForMutations}
                currentKey={currentKey}
                items={itemsForMove}
                applyMutationResult={applyMutationResult}
                refresh={refresh}
              />
            }
          />
        </ActionPanel.Section>
        <ActionPanel.Section title="Copy">
          <Action.CopyToClipboard
            title="Copy Title"
            content={itemForKey.display.replace(/\s+@\s*$/, "").trim()}
          />
        </ActionPanel.Section>
        <ActionPanel.Section title="Other">
          <Action
            title="Tui"
            icon={Icon.Terminal}
            onAction={async () => {
              try {
                await openTerminalWithNowTui(pathForMutations);
                await showToast(Toast.Style.Success, "Terminal opened");
              } catch (e) {
                await showToast(
                  Toast.Style.Failure,
                  "Could not open Terminal",
                  String(e),
                );
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
          <Action
            title="Open Extension Preferences"
            onAction={openCommandPreferences}
          />
        </ActionPanel.Section>
      </ActionPanel>
    ) as any;
  }

  // Fixed action ids
  switch (selectionId) {
    case "action-add":
      return (
        <ActionPanel>
          <Action.Push
            title="Narrow Focus"
            icon={Icon.ChevronRight}
            target={
              <AddNestedForm
                nowFilePath={pathForMutations}
                applyMutationResult={applyMutationResult}
                refresh={refresh}
              />
            }
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
                setSelectedId("action-add");
              }}
            />
          ) : null}
          {otherSection}
        </ActionPanel>
      ) as any;
    case "action-dive-in":
      return (
        <ActionPanel>
          <Action
            title="Dive In"
            icon={Icon.ChevronDown}
            onAction={async () => {
              await runNav(async () => {
                await runDiveIn(pathForMutations);
                return null;
              }, "Dove in");
              setSelectedId("action-add");
            }}
          />
          {otherSection}
        </ActionPanel>
      ) as any;
    case "action-complete":
      return (
        <ActionPanel>
          <Action
            title="Finish This"
            icon={Icon.Checkmark}
            onAction={async () => {
              await runNav(() => runComplete(pathForMutations), "Completed");
            }}
          />
          {otherSection}
        </ActionPanel>
      ) as any;
    case "action-later":
      return (
        <ActionPanel>
          <Action.Push
            title="Add Followup"
            icon={Icon.Ellipsis}
            target={
              <LaterForm
                nowFilePath={pathForMutations}
                applyMutationResult={applyMutationResult}
                refresh={refresh}
              />
            }
          />
          {otherSection}
        </ActionPanel>
      );
    case "action-edit":
      return (focus ? (
        <ActionPanel>
          <Action.Push
            title="Edit"
            icon={Icon.TextCursor}
            target={
              <EditForm
                nowFilePath={pathForMutations}
                currentName={focus.focus}
                applyMutationResult={applyMutationResult}
                refresh={refresh}
              />
            }
          />
          {otherSection}
        </ActionPanel>
      ) : null) as any;
    case "action-wrap":
      return (
        <ActionPanel>
          <Action.Push
            title="Wrap"
            icon={Icon.ArrowUp}
            target={
              <WrapForm
                nowFilePath={pathForMutations}
                applyMutationResult={applyMutationResult}
                refresh={refresh}
              />
            }
          />
          {otherSection}
        </ActionPanel>
      ) as any;
    case "action-move":
      return (
        <ActionPanel>
          <Action.Push
            title="Move"
            icon={Icon.ArrowRight}
            target={
              <MoveTargetList
                nowFilePath={pathForMutations}
                currentKey={currentKey}
                items={itemsForMove}
                applyMutationResult={applyMutationResult}
                refresh={refresh}
              />
            }
          />
          {otherSection}
        </ActionPanel>
      ) as any;
    case "action-open-editor":
      return (
        <ActionPanel>
          <Action.Open
            title="Open in Editor"
            icon={Icon.Document}
            target={pathForMutations}
          />
          {otherSection}
        </ActionPanel>
      ) as any;
    default:
      return null;
  }
}

type ListFocusLaunchContext = { path?: string };

export default function Command(
  props: LaunchProps<{ launchContext?: ListFocusLaunchContext }>,
) {
  const prefs = getPreferenceValues<Preferences>();
  const defaultPath = resolveNowFilePath(prefs.focusFilePath);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const initialPinnedPath = props.launchContext?.path ?? null;

  const {
    nowFilePath,
    currentApp,
    currentDocumentPath,
    appPathForCurrent,
    docPathForCurrent,
    pathReady,
    appPathsJson,
    docPathsJson,
    refreshPathFromStorage,
    setUseGlobal,
    setLastResolvedPath,
    addAppPathMapping,
    addDocumentPathMapping,
  } = useNowPathFromStorage({
    defaultPath,
    appSpecificNowFiles: prefs.appSpecificNowFiles,
  });

  const {
    focus,
    items,
    error,
    errorMessage,
    isLoading,
    refresh,
    applyMutationResult,
    setPinnedPath,
    effectivePath,
  } = useFocusData(pathReady ? nowFilePath : null, initialPinnedPath);
  const hasDeferredOneThingSync = useRef(false);

  const itemsForMove = useMemo(() => items ?? [], [items]);

  const currentKey = focus?.key ?? "";
  const hasItems = Array.isArray(items) && items.length > 0;
  const showEmpty = !isLoading && (error || !hasItems);
  const fileMissing = error && !focusFileExists(effectivePath ?? "");
  const cliMissing = useCliMissing(showEmpty && !!error && !fileMissing);

  const switchToGlobal = useCallback(async () => {
    await setUseGlobal(true);
    await refreshPathFromStorage();
    setPinnedPath(defaultPath);
    const result = await runSwitch(defaultPath, "0");
    if (result) await applyMutationResult(result);
    else await refresh();
    setSelectedId("action-add");
  }, [
    setUseGlobal,
    refreshPathFromStorage,
    setPinnedPath,
    defaultPath,
    applyMutationResult,
    refresh,
    setSelectedId,
  ]);

  const switchToDocument = useCallback(async () => {
    const path = docPathForCurrent ?? "";
    await setUseGlobal(false);
    await setLastResolvedPath(path);
    await refreshPathFromStorage();
    setPinnedPath(docPathForCurrent ?? null);
    const result = await runSwitch(path, "0");
    if (result) await applyMutationResult(result);
    else await refresh();
    setSelectedId("action-add");
  }, [
    setUseGlobal,
    setLastResolvedPath,
    refreshPathFromStorage,
    setPinnedPath,
    docPathForCurrent,
    applyMutationResult,
    refresh,
    setSelectedId,
  ]);

  const switchToApp = useCallback(async () => {
    const path = appPathForCurrent ?? "";
    await setUseGlobal(false);
    await setLastResolvedPath(path);
    await refreshPathFromStorage();
    setPinnedPath(appPathForCurrent ?? null);
    const result = await runSwitch(path, "0");
    if (result) await applyMutationResult(result);
    else await refresh();
    setSelectedId("action-add");
  }, [
    setUseGlobal,
    setLastResolvedPath,
    refreshPathFromStorage,
    setPinnedPath,
    appPathForCurrent,
    applyMutationResult,
    refresh,
    setSelectedId,
  ]);

  const createForDocument = useCallback(async () => {
    if (!currentDocumentPath) return;
    const path = resolveNowFilePath(
      suggestedNowPathForDocument(currentDocumentPath),
    );
    try {
      await createFocusFile(path, documentDisplayName(currentDocumentPath));
      const result = await runSwitch(path, "0");
      if (result) await applyMutationResult(result);
      else await refresh();
      await addDocumentPathMapping(
        currentDocumentPath,
        suggestedNowPathForDocument(currentDocumentPath),
      );
      await setUseGlobal(false);
      await refreshPathFromStorage();
      setPinnedPath(path);
      await showToast(
        Toast.Style.Success,
        "Created and using for current document",
      );
      await refresh();
      setSelectedId("action-add");
    } catch (e) {
      await showToast(Toast.Style.Failure, "Failed to create file", String(e));
    }
  }, [
    currentDocumentPath,
    addDocumentPathMapping,
    setUseGlobal,
    refreshPathFromStorage,
    setPinnedPath,
    refresh,
    applyMutationResult,
    setSelectedId,
  ]);

  const createForApp = useCallback(async () => {
    if (!currentApp) return;
    const path = resolveNowFilePath(suggestedNowPathForApp(currentApp));
    try {
      await createFocusFile(path, currentApp.name);
      const result = await runSwitch(path, "0");
      if (result) await applyMutationResult(result);
      else await refresh();
      const key = currentApp.bundleId ?? currentApp.name;
      await addAppPathMapping(key, suggestedNowPathForApp(currentApp));
      await setUseGlobal(false);
      await refreshPathFromStorage();
      setPinnedPath(path);
      await showToast(
        Toast.Style.Success,
        `Created and using for ${currentApp.name}`,
      );
      await refresh();
      setSelectedId("action-add");
    } catch (e) {
      await showToast(Toast.Style.Failure, "Failed to create file", String(e));
    }
  }, [
    currentApp,
    addAppPathMapping,
    setUseGlobal,
    refreshPathFromStorage,
    setPinnedPath,
    refresh,
    applyMutationResult,
    setSelectedId,
  ]);

  const pathSwitchContext = useMemo(
    () =>
      computePathSwitchContext({
        activePath: effectivePath,
        defaultPath,
        docPathForCurrent,
        appPathForCurrent,
        currentApp,
        currentDocumentPath,
      }),
    [
      effectivePath,
      defaultPath,
      docPathForCurrent,
      appPathForCurrent,
      currentApp,
      currentDocumentPath,
    ],
  );
  const nowInputLabel = pathSwitchContext.contextLabel;

  /** Path used for all mutations and forms; pinned so it does not flip when frontmost app changes. */
  const pathForMutations = effectivePath ?? nowFilePath ?? "";

  /** Preview data for switch-target paths (global, document, app) so the detail panel shows the target file's content. */
  const [switchTargetPreviews, setSwitchTargetPreviews] = useState<
    Record<string, FocusDataResult>
  >({});
  useEffect(() => {
    if (!pathReady || !defaultPath) return;
    const paths = collectPathsToWatch(
      defaultPath,
      appPathsJson,
      docPathsJson,
      prefs.appSpecificNowFiles,
    );
    ensureWatcherRunning(
      environment.supportPath,
      environment.assetsPath,
      paths,
      createDeeplink({
        command: "menu-bar-focus",
        launchType: LaunchType.Background,
      }),
    );
  }, [
    pathReady,
    defaultPath,
    appPathsJson,
    docPathsJson,
    prefs.appSpecificNowFiles,
    environment.supportPath,
    environment.assetsPath,
  ]);

  useEffect(() => {
    if (!pathReady) return;
    const targets = pathSwitchContextSwitchTargetPaths(pathSwitchContext);
    let cancelled = false;
    targets.forEach((path) => {
      fetchFocusData(path).then((result) => {
        if (!cancelled) {
          setSwitchTargetPreviews((prev) => ({ ...prev, [path]: result }));
        }
      });
    });
    return () => {
      cancelled = true;
    };
  }, [pathReady, pathSwitchContext]);

  useEffect(() => {
    if (!prefs.updateOneThing || !focus?.focus) return;
    if (hasDeferredOneThingSync.current) {
      open(getOneThingUrl(focus.focus));
    } else {
      hasDeferredOneThingSync.current = true;
    }
  }, [prefs.updateOneThing, focus?.focus, effectivePath]);

  /** Compute detail element unconditionally so useMemo is always called (Rules of Hooks). */
  const itemKeys = new Set((items ?? []).map((i) => i.key));
  const effectiveSelectedId =
    selectedId != null &&
      (selectedId.startsWith("action-") || itemKeys.has(selectedId))
      ? selectedId
      : currentKey && itemKeys.has(currentKey)
        ? currentKey
        : undefined;
  /** Cache detail per selection id so arrowing doesn't create new elements and trigger rerender warnings. */
  const detailBySelection = useMemo(() => {
    const itemList = items ?? [];
    const keys = new Set(itemList.map((i) => i.key));
    const breadcrumb = focus?.breadcrumb ?? "";
    const currentItemName = focus?.focus ?? "";
    const actionIds: string[] = [
      "action-add",
      "action-complete",
      "action-later",
      "action-wrap",
      "action-move",
      "action-open-editor",
    ];
    if (focus) actionIds.push("action-edit");
    if (focus && !focus.isLeaf) actionIds.push("action-dive-in");
    const pathDescriptors = pathSwitchContextToDescriptors(pathSwitchContext);
    for (const d of pathDescriptors) {
      actionIds.push(`action-${d.id}`);
    }
    const allIds: string[] = [...actionIds, ...keys];
    const record: Record<string, ReactNode> = {};

    function markdownForSwitchTarget(path: string): string {
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

    for (const id of allIds) {
      if (id === "action-switch-global") {
        record[id] = (
          <List.Item.Detail markdown={markdownForSwitchTarget(defaultPath)} />
        );
        continue;
      }
      if (id === "action-switch-document" && docPathForCurrent) {
        record[id] = (
          <List.Item.Detail
            markdown={markdownForSwitchTarget(docPathForCurrent)}
          />
        );
        continue;
      }
      if (id === "action-switch-app" && appPathForCurrent) {
        record[id] = (
          <List.Item.Detail
            markdown={markdownForSwitchTarget(appPathForCurrent)}
          />
        );
        continue;
      }
      if (id === "action-create-document" && currentDocumentPath) {
        const rootName = documentDisplayName(currentDocumentPath);
        const newFileItems: JsonItem[] = [
          { display: `${rootName} @`, key: "0" },
        ];
        const markdown = buildPreviewMarkdown(
          newFileItems,
          "0",
          "Focusing on",
          rootName,
          null,
          null,
          DETAIL_PANEL_BREADCRUMB_MAX_LENGTH,
        );
        record[id] = <List.Item.Detail markdown={markdown} />;
        continue;
      }
      if (id === "action-create-app" && currentApp) {
        const rootName = currentApp.name;
        const newFileItems: JsonItem[] = [
          { display: `${rootName} @`, key: "0" },
        ];
        const markdown = buildPreviewMarkdown(
          newFileItems,
          "0",
          "Focusing on",
          rootName,
          null,
          null,
          DETAIL_PANEL_BREADCRUMB_MAX_LENGTH,
        );
        record[id] = <List.Item.Detail markdown={markdown} />;
        continue;
      }

      const selectedKeyInTree: string | null = id.startsWith("action-")
        ? null
        : keys.has(id)
          ? id
          : null;
      const rawAction = id.startsWith("action-") ? id.slice(7) : null;
      const normalizedAction: PreviewAction =
        rawAction &&
          PREVIEW_ACTION_VALUES.includes(
            rawAction as (typeof PREVIEW_ACTION_VALUES)[number],
          )
          ? (rawAction as PreviewAction)
          : null;
      const isSwitchTarget =
        selectedKeyInTree !== null && selectedKeyInTree !== currentKey;
      const { breadcrumb: previewBreadcrumb, focusName: previewFocusName } =
        isSwitchTarget
          ? getBreadcrumbAndNameForKey(itemList, selectedKeyInTree)
          : { breadcrumb, focusName: currentItemName };
      const markdown = buildPreviewMarkdown(
        itemList,
        currentKey,
        previewBreadcrumb,
        previewFocusName,
        selectedKeyInTree,
        normalizedAction,
        DETAIL_PANEL_BREADCRUMB_MAX_LENGTH,
      );
      record[id] = <List.Item.Detail markdown={markdown} />;
    }
    return record;
  }, [
    items,
    currentKey,
    focus?.breadcrumb,
    focus?.focus,
    focus,
    currentDocumentPath,
    docPathForCurrent,
    currentApp,
    appPathForCurrent,
    pathSwitchContext,
    defaultPath,
    switchTargetPreviews,
  ]);

  const detail =
    detailBySelection[effectiveSelectedId ?? currentKey ?? "action-add"] ??
    detailBySelection["action-add"] ??
    null;

  /** Stable callback so List doesn't re-sync selection on every render (avoids render loop when arrowing). Only update state when the id actually changes so Raycast re-syncing the same selection doesn't trigger another render. */
  const handleSelectionChange = useCallback((id: string | null | undefined) => {
    const next = id ?? null;
    setSelectedId((prev) => (prev === next ? prev : next));
  }, []);

  /** All hooks below must run on every render (Rules of Hooks). Do not add early returns above them. */
  const pathDescriptorsForList = useMemo(
    () => pathSwitchContextToDescriptors(pathSwitchContext),
    [pathSwitchContext],
  );
  const hasSwitchOptions = pathDescriptorsForList.length > 0;
  const pathSwitchCallbacks: PathSwitchCallbacks = useMemo(
    () => ({
      "switch-global": switchToGlobal,
      "switch-document": switchToDocument,
      "switch-app": switchToApp,
      "create-document": createForDocument,
      "create-app": createForApp,
    }),
    [
      switchToGlobal,
      switchToDocument,
      switchToApp,
      createForDocument,
      createForApp,
    ],
  );
  const contextSection = useMemo(
    () =>
      hasSwitchOptions ? (
        <ActionPanel.Section title={nowInputLabel}>
          <PathSwitchActionsList
            context={pathSwitchContext}
            callbacks={pathSwitchCallbacks}
          />
        </ActionPanel.Section>
      ) : null,
    [
      hasSwitchOptions,
      nowInputLabel,
      pathSwitchContext,
      pathSwitchCallbacks,
    ],
  );
  const otherSection = useMemo(
    () => (
      <>
        {contextSection}
        <ActionPanel.Section title="Other">
          <Action
            title="Tui"
            icon={Icon.Terminal}
            onAction={async () => {
              try {
                await openTerminalWithNowTui(pathForMutations);
                await showToast(Toast.Style.Success, "Terminal opened");
              } catch (e) {
                await showToast(
                  Toast.Style.Failure,
                  "Could not open Terminal",
                  String(e),
                );
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
        </ActionPanel.Section>
      </>
    ),
    [contextSection, pathForMutations, refresh],
  );
  const runNav = useCallback(
    async (fn: () => Promise<MutationResult | null>, label: string) => {
      try {
        const result = await fn();
        if (result) await applyMutationResult(result);
        else await refresh();
        await showToast(Toast.Style.Success, label);
      } catch (e) {
        await showToast(Toast.Style.Failure, label, String(e));
      }
    },
    [applyMutationResult, refresh],
  );

  /** Single descriptor-based factory: one useMemo builds all action panels from (selectionId + context). */
  const actionPanelContext = useMemo<ActionPanelContext>(
    () => ({
      pathForMutations,
      focus,
      currentKey,
      itemsForMove,
      applyMutationResult,
      refresh,
      runNav,
      setSelectedId,
      pathDescriptorsForList,
      pathSwitchCallbacks,
      otherSection,
      contextSection,
    }),
    [
      pathForMutations,
      focus,
      currentKey,
      itemsForMove,
      applyMutationResult,
      refresh,
      runNav,
      pathDescriptorsForList,
      pathSwitchCallbacks,
      otherSection,
      contextSection,
    ],
  );
  const allSelectionIds = useMemo(() => {
    const actionIds: string[] = [
      "action-add",
      "action-complete",
      "action-later",
      "action-wrap",
      "action-move",
      "action-open-editor",
    ];
    if (focus) actionIds.push("action-edit");
    if (focus && !focus.isLeaf) actionIds.push("action-dive-in");
    const pathIds = pathDescriptorsForList.map((d) => `action-${d.id}`);
    const switchItemKeys = itemsForMove
      .filter((i) => i.key !== currentKey)
      .map((i) => i.key);
    return [...actionIds, ...pathIds, ...switchItemKeys];
  }, [focus, pathDescriptorsForList, itemsForMove, currentKey]);
  const actionPanelsBySelection = useMemo(() => {
    const map: Record<string, ReactNode> = {};
    for (const id of allSelectionIds) {
      const panel = buildActionPanel(id, actionPanelContext);
      if (panel != null) map[id] = panel;
    }
    return map;
  }, [allSelectionIds, actionPanelContext]);

  if (!pathReady) {
    return (
      <List isLoading searchBarPlaceholder="Now">
        <List.EmptyView title="Loading…" description="Resolving focus file…" />
      </List>
    );
  }

  if (showEmpty) {
    const emptyDescription =
      (fileMissing
        ? "Create a new focus file to get started."
        : cliMissing
          ? "Install the now CLI to use this extension."
          : error
            ? (errorMessage ??
              "Check path and format, or run 'now status' in Terminal to see the CLI error.")
            : "Set your focus file path in extension preferences and ensure the now CLI is installed.") +
      `\n\n${nowInputLabel}`;
    return (
      <List isLoading={isLoading} searchBarPlaceholder={nowInputLabel}>
        <List.EmptyView
          title={
            fileMissing
              ? "No focus file at path"
              : error
                ? cliMissing
                  ? "now CLI not installed"
                  : "Could not read focus file"
                : "No focusable items"
          }
          description={emptyDescription}
          icon={Icon.Warning}
          actions={
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
                      // Defer refresh so the view can update (avoids stale UI)
                      await new Promise((r) => setTimeout(r, 100));
                      await refresh();
                    } catch (e) {
                      await showToast(
                        Toast.Style.Failure,
                        "Failed to create file",
                        String(e),
                      );
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
                        await showToast(
                          Toast.Style.Failure,
                          "Could not open Terminal",
                          String(e),
                        );
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
                      await showToast(
                        Toast.Style.Failure,
                        "Could not open Terminal",
                        String(e),
                      );
                    }
                  }}
                />
              ) : null}
              <Action
                title="Tui"
                icon={Icon.Terminal}
                onAction={async () => {
                  try {
                    await openTerminalWithNowTui(pathForMutations);
                    await showToast(Toast.Style.Success, "Terminal opened");
                  } catch (e) {
                    await showToast(
                      Toast.Style.Failure,
                      "Could not open Terminal",
                      String(e),
                    );
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
                onAction={async () => {
                  await refresh();
                }}
              />
              <Action
                title="Open Extension Preferences"
                onAction={openCommandPreferences}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder={nowInputLabel}
      selectedItemId={effectiveSelectedId}
      onSelectionChange={handleSelectionChange}
    >
      <List.Section title="Actions">
        <List.Item
          id="action-add"
          title="Narrow Focus"
          icon={Icon.ChevronRight}
          detail={detail as any}
          actions={actionPanelsBySelection["action-add"] as any}
        />
        {focus && !focus.isLeaf ? (
          <List.Item
            id="action-dive-in"
            title="Dive In"
            icon={Icon.ChevronDown}
            detail={detail as any}
            actions={actionPanelsBySelection["action-dive-in"] as any}
          />
        ) : null}
        <List.Item
          id="action-complete"
          title="Finish This"
          icon={Icon.Checkmark}
          detail={detail as any}
          actions={actionPanelsBySelection["action-complete"] as any}
        />
        <List.Item
          id="action-later"
          title="Add Followup"
          icon={Icon.Ellipsis}
          detail={detail as any}
          actions={actionPanelsBySelection["action-later"] as any}
        />
        {focus ? (
          <List.Item
            id="action-edit"
            title="Edit"
            icon={Icon.TextCursor}
            detail={detail as any}
            actions={actionPanelsBySelection["action-edit"] as any}
          />
        ) : null}
        <List.Item
          id="action-wrap"
          title="Wrap"
          icon={Icon.ArrowUp}
          detail={detail as any}
          actions={actionPanelsBySelection["action-wrap"] as any}
        />
        <List.Item
          id="action-move"
          title="Move"
          icon={Icon.ArrowRight}
          detail={detail as any}
          actions={actionPanelsBySelection["action-move"] as any}
        />
      </List.Section>
      <List.Section title="Now File">
        <List.Item
          id="action-open-editor"
          title="Open in Editor"
          icon={Icon.Document}
          detail={detail as any}
          actions={actionPanelsBySelection["action-open-editor"] as any}
        />
        {pathDescriptorsForList.map((d: PathActionDescriptor) => (
          <List.Item
            key={d.id}
            id={`action-${d.id}`}
            title={d.title}
            icon={
              d.id === "switch-global"
                ? Icon.Circle
                : d.id === "switch-document"
                  ? Icon.Document
                  : d.id === "switch-app"
                    ? Icon.AppWindow
                    : Icon.Plus
            }
            detail={detail as any}
            actions={actionPanelsBySelection[`action-${d.id}`] as any}
          />
        ))}
      </List.Section>
      <List.Section title="Switch">
        {items
          ?.filter((item) => item.key !== currentKey)
          .map((item) => {
            const isCurrent = item.key === currentKey;
            return (
              <List.Item
                key={item.key}
                id={item.key}
                title={item.display.trim()}
                icon={isCurrent ? Icon.Star : undefined}
                detail={detail as any}
                actions={actionPanelsBySelection[item.key] as any}
              />
            );
          })}
      </List.Section>
    </List>
  );
}
