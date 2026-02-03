import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  Icon,
  List,
  open,
  openCommandPreferences,
  showToast,
  Toast,
  useNavigation,
  type LaunchProps,
} from "@raycast/api";
import { useCallback, useEffect, memo, useMemo, useRef, useState, type ReactNode } from "react";

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
  runEdit,
  runLater,
  getPreviewMarkdownForMove,
  runMove,
  runNowInstallInTerminal,
  runSwitch,
  runWrap,
} from "./lib/now";
import { useCliMissing } from "./lib/useCliMissing";
import { fetchFocusData, useFocusData, type FocusDataResult } from "./lib/useFocusData";
import { useNowPathFromStorage } from "./lib/useNowPath";
import {
  buildPreviewMarkdown,
  getBreadcrumbAndNameForKey,
  PREVIEW_ACTION_VALUES,
  type PreviewAction,
} from "now-format";

const DEFAULT_BREADCRUMB_MAX_LENGTH = 64;

/** List no longer opens the menubar after mutations; that caused extension reload. Menubar reads from focus cache when opened. */
interface Preferences {
  focusFilePath: string;
  updateOneThing?: boolean;
  appSpecificNowFiles?: string;
  breadcrumbMaxLength?: string;
}

/** Shared props for path switch/create actions (empty state and context section). */
interface PathSwitchCreateActionsProps {
  effectivePath: string | null;
  defaultPath: string;
  docPathForCurrent: string | null;
  appPathForCurrent: string | null;
  currentApp: { name: string; bundleId?: string } | null;
  currentDocumentPath: string | null;
  switchToGlobal: () => Promise<void>;
  switchToDocument: () => Promise<void>;
  switchToApp: () => Promise<void>;
  createForDocument: () => Promise<void>;
  createForApp: () => Promise<void>;
}

function PathSwitchCreateActions({
  effectivePath,
  defaultPath,
  docPathForCurrent,
  appPathForCurrent,
  currentApp,
  currentDocumentPath,
  switchToGlobal,
  switchToDocument,
  switchToApp,
  createForDocument,
  createForApp,
}: PathSwitchCreateActionsProps) {
  return (
    <>
      {effectivePath !== defaultPath ? (
        <Action title="Switch to Global" icon={Icon.Circle} onAction={switchToGlobal} />
      ) : null}
      {docPathForCurrent && effectivePath !== docPathForCurrent ? (
        <Action
          title="Switch to Document File"
          icon={Icon.Document}
          onAction={switchToDocument}
        />
      ) : null}
      {appPathForCurrent && currentApp && effectivePath !== appPathForCurrent ? (
        <Action
          title={`Switch to ${currentApp.name} file`}
          icon={Icon.AppWindow}
          onAction={switchToApp}
        />
      ) : null}
      {currentDocumentPath && !docPathForCurrent ? (
        <Action
          title={`Create Now File for ${documentDisplayName(currentDocumentPath)}`}
          icon={Icon.Plus}
          onAction={createForDocument}
        />
      ) : null}
      {currentApp && !appPathForCurrent ? (
        <Action
          title={`Create Now File for ${currentApp.name}`}
          icon={Icon.Plus}
          onAction={createForApp}
        />
      ) : null}
    </>
  );
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

type ListFocusLaunchContext = { path?: string };

export default function Command(props: LaunchProps<{ launchContext?: ListFocusLaunchContext }>) {
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
    refreshPathFromStorage,
    setUseGlobal,
    setLastResolvedPath,
    addAppPathMapping,
    addDocumentPathMapping,
  } = useNowPathFromStorage({
    defaultPath,
    appSpecificNowFiles: prefs.appSpecificNowFiles,
  });

  const { focus, items, error, errorMessage, isLoading, refresh, applyMutationResult, setPinnedPath, effectivePath } =
    useFocusData(pathReady ? nowFilePath : null, initialPinnedPath);
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
  }, [setUseGlobal, refreshPathFromStorage, setPinnedPath, defaultPath]);

  const switchToDocument = useCallback(async () => {
    await setUseGlobal(false);
    await setLastResolvedPath(docPathForCurrent ?? "");
    await refreshPathFromStorage();
    setPinnedPath(docPathForCurrent ?? null);
  }, [setUseGlobal, setLastResolvedPath, refreshPathFromStorage, setPinnedPath, docPathForCurrent]);

  const switchToApp = useCallback(async () => {
    await setUseGlobal(false);
    await setLastResolvedPath(appPathForCurrent ?? "");
    await refreshPathFromStorage();
    setPinnedPath(appPathForCurrent ?? null);
  }, [setUseGlobal, setLastResolvedPath, refreshPathFromStorage, setPinnedPath, appPathForCurrent]);

  const createForDocument = useCallback(async () => {
    if (!currentDocumentPath) return;
    const path = resolveNowFilePath(suggestedNowPathForDocument(currentDocumentPath));
    try {
      await createFocusFile(path, documentDisplayName(currentDocumentPath));
      await addDocumentPathMapping(
        currentDocumentPath,
        suggestedNowPathForDocument(currentDocumentPath),
      );
      await setUseGlobal(false);
      await refreshPathFromStorage();
      setPinnedPath(path);
      await showToast(Toast.Style.Success, "Created and using for current document");
      await refresh();
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
  ]);

  const createForApp = useCallback(async () => {
    if (!currentApp) return;
    const path = resolveNowFilePath(suggestedNowPathForApp(currentApp));
    try {
      await createFocusFile(path, currentApp.name);
      const key = currentApp.bundleId ?? currentApp.name;
      await addAppPathMapping(key, suggestedNowPathForApp(currentApp));
      await setUseGlobal(false);
      await refreshPathFromStorage();
      setPinnedPath(path);
      await showToast(Toast.Style.Success, `Created and using for ${currentApp.name}`);
      await refresh();
    } catch (e) {
      await showToast(Toast.Style.Failure, "Failed to create file", String(e));
    }
  }, [currentApp, addAppPathMapping, setUseGlobal, refreshPathFromStorage, setPinnedPath, refresh]);

  const nowInputLabel =
    effectivePath === defaultPath
      ? "Now"
      : docPathForCurrent && effectivePath === docPathForCurrent && currentDocumentPath
        ? `Now: ${documentDisplayName(currentDocumentPath)}`
        : appPathForCurrent && effectivePath === appPathForCurrent && currentApp
          ? `Now: ${currentApp.name}`
          : "Now";

  /** Path used for all mutations and forms; pinned so it does not flip when frontmost app changes. */
  const pathForMutations = effectivePath ?? nowFilePath ?? "";

  /** Preview data for switch-target paths (global, document, app) so the detail panel shows the target file's content. */
  const [switchTargetPreviews, setSwitchTargetPreviews] = useState<Record<string, FocusDataResult>>({});
  useEffect(() => {
    if (!pathReady) return;
    const targets: string[] = [];
    if (defaultPath && effectivePath !== defaultPath) targets.push(defaultPath);
    if (docPathForCurrent && effectivePath !== docPathForCurrent) targets.push(docPathForCurrent);
    if (appPathForCurrent && effectivePath !== appPathForCurrent) targets.push(appPathForCurrent);
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
  }, [pathReady, effectivePath, defaultPath, docPathForCurrent, appPathForCurrent]);

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
    selectedId != null && (selectedId.startsWith("action-") || itemKeys.has(selectedId))
      ? selectedId
      : currentKey && itemKeys.has(currentKey)
        ? currentKey
        : undefined;
  const rawBreadcrumbMax =
    (prefs.breadcrumbMaxLength ?? String(DEFAULT_BREADCRUMB_MAX_LENGTH)).trim() ||
    String(DEFAULT_BREADCRUMB_MAX_LENGTH);
  const parsedBreadcrumbMax = parseInt(rawBreadcrumbMax, 10);
  const breadcrumbMaxLengthParam =
    Number.isNaN(parsedBreadcrumbMax) || parsedBreadcrumbMax <= 0
      ? undefined
      : parsedBreadcrumbMax;

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
    if (currentDocumentPath && !docPathForCurrent) actionIds.push("action-create-document");
    if (currentApp && !appPathForCurrent) actionIds.push("action-create-app");
    if (effectivePath !== defaultPath) actionIds.push("action-switch-global");
    if (docPathForCurrent && effectivePath !== docPathForCurrent) actionIds.push("action-switch-document");
    if (appPathForCurrent && currentApp && effectivePath !== appPathForCurrent) actionIds.push("action-switch-app");
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
          breadcrumbMaxLengthParam,
        );
      }
      return "Loading…";
    }

    for (const id of allIds) {
      if (id === "action-switch-global") {
        record[id] = <List.Item.Detail markdown={markdownForSwitchTarget(defaultPath)} />;
        continue;
      }
      if (id === "action-switch-document" && docPathForCurrent) {
        record[id] = <List.Item.Detail markdown={markdownForSwitchTarget(docPathForCurrent)} />;
        continue;
      }
      if (id === "action-switch-app" && appPathForCurrent) {
        record[id] = <List.Item.Detail markdown={markdownForSwitchTarget(appPathForCurrent)} />;
        continue;
      }

      const selectedKeyInTree: string | null = id.startsWith("action-") ? null : (keys.has(id) ? id : null);
      const rawAction = id.startsWith("action-") ? id.slice(7) : null;
      const normalizedAction: PreviewAction =
        rawAction &&
          PREVIEW_ACTION_VALUES.includes(rawAction as (typeof PREVIEW_ACTION_VALUES)[number])
          ? (rawAction as PreviewAction)
          : null;
      const isSwitchTarget = selectedKeyInTree !== null && selectedKeyInTree !== currentKey;
      const { breadcrumb: previewBreadcrumb, focusName: previewFocusName } = isSwitchTarget
        ? getBreadcrumbAndNameForKey(itemList, selectedKeyInTree)
        : { breadcrumb, focusName: currentItemName };
      const markdown = buildPreviewMarkdown(
        itemList,
        currentKey,
        previewBreadcrumb,
        previewFocusName,
        selectedKeyInTree,
        normalizedAction,
        breadcrumbMaxLengthParam,
      );
      record[id] = <List.Item.Detail markdown={markdown} />;
    }
    return record;
  }, [
    items,
    currentKey,
    focus?.breadcrumb,
    focus?.focus,
    breadcrumbMaxLengthParam,
    focus,
    currentDocumentPath,
    docPathForCurrent,
    currentApp,
    appPathForCurrent,
    effectivePath,
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
  const hasSwitchOptions = Boolean(
    effectivePath !== defaultPath ||
    docPathForCurrent ||
    (appPathForCurrent && currentApp) ||
    (currentDocumentPath && !docPathForCurrent) ||
    (currentApp && !appPathForCurrent),
  );
  const contextSection = useMemo(
    () =>
      hasSwitchOptions ? (
        <ActionPanel.Section title={nowInputLabel}>
          <PathSwitchCreateActions
            effectivePath={effectivePath}
            defaultPath={defaultPath}
            docPathForCurrent={docPathForCurrent}
            appPathForCurrent={appPathForCurrent}
            currentApp={currentApp}
            currentDocumentPath={currentDocumentPath}
            switchToGlobal={switchToGlobal}
            switchToDocument={switchToDocument}
            switchToApp={switchToApp}
            createForDocument={createForDocument}
            createForApp={createForApp}
          />
        </ActionPanel.Section>
      ) : null,
    [
      hasSwitchOptions,
      nowInputLabel,
      effectivePath,
      defaultPath,
      docPathForCurrent,
      appPathForCurrent,
      currentApp,
      currentDocumentPath,
      switchToGlobal,
      switchToDocument,
      switchToApp,
      createForDocument,
      createForApp,
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
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
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
  const actionsForAdd = useMemo(
    () => (
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
        {otherSection}
      </ActionPanel>
    ),
    [pathForMutations, applyMutationResult, refresh, otherSection],
  );
  const actionsForComplete = useMemo(
    () => (
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
    ),
    [pathForMutations, runNav, otherSection],
  );
  const actionsForLater = useMemo(
    () => (
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
    ),
    [pathForMutations, applyMutationResult, refresh, otherSection],
  );
  const actionsForEdit = useMemo(
    () =>
      focus ? (
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
      ) : null,
    [pathForMutations, focus?.focus, applyMutationResult, refresh, otherSection],
  );
  const actionsForWrap = useMemo(
    () => (
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
    ),
    [pathForMutations, applyMutationResult, refresh, otherSection],
  );
  const actionsForMove = useMemo(
    () => (
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
    ),
    [pathForMutations, currentKey, itemsForMove, applyMutationResult, refresh, otherSection],
  );
  const actionsForOpenEditor = useMemo(
    () => (
      <ActionPanel>
        <Action.Open
          title="Open in Editor"
          icon={Icon.Document}
          target={pathForMutations}
        />
        {otherSection}
      </ActionPanel>
    ),
    [pathForMutations, otherSection],
  );
  const actionsForCreateDocument = useMemo(
    () => (
      <ActionPanel>
        <Action
          title={`Create Now File for ${documentDisplayName(currentDocumentPath ?? "")}`}
          icon={Icon.Plus}
          onAction={createForDocument}
        />
        {otherSection}
      </ActionPanel>
    ),
    [currentDocumentPath, createForDocument, otherSection],
  );
  const actionsForCreateApp = useMemo(
    () => (
      <ActionPanel>
        <Action
          title={`Create Now File for ${currentApp?.name ?? ""}`}
          icon={Icon.Plus}
          onAction={createForApp}
        />
        {otherSection}
      </ActionPanel>
    ),
    [currentApp?.name, createForApp, otherSection],
  );

  const actionsForSwitchToGlobal = useMemo(
    () => (
      <ActionPanel>
        <Action title="Switch to Global" icon={Icon.Circle} onAction={switchToGlobal} />
        {otherSection}
      </ActionPanel>
    ),
    [switchToGlobal, otherSection],
  );
  const actionsForSwitchToDocument = useMemo(
    () => (
      <ActionPanel>
        <Action
          title="Switch to Document File"
          icon={Icon.Document}
          onAction={switchToDocument}
        />
        {otherSection}
      </ActionPanel>
    ),
    [switchToDocument, otherSection],
  );
  const actionsForSwitchToApp = useMemo(
    () => (
      <ActionPanel>
        <Action
          title={`Switch to ${currentApp?.name ?? ""} file`}
          icon={Icon.AppWindow}
          onAction={switchToApp}
        />
        {otherSection}
      </ActionPanel>
    ),
    [currentApp?.name, switchToApp, otherSection],
  );

  /** Memoize action panels per Switch section item so actions refs are stable when only selection changes. */
  const actionsBySwitchItemKey = useMemo(() => {
    const targets = itemsForMove.filter((i) => i.key !== currentKey);
    const map: Record<string, ReactNode> = {};
    for (const item of targets) {
      const isCurrent = item.key === currentKey;
      map[item.key] = (
        <ActionPanel>
          {contextSection}
          <ActionPanel.Section title="Focus">
            <Action
              title="Switch"
              icon={Icon.Star}
              onAction={async () => {
                try {
                  const result = await runSwitch(pathForMutations, item.key);
                  if (result) await applyMutationResult(result);
                  else await refresh();
                  await showToast(Toast.Style.Success, "Focus updated");
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
              content={item.display.replace(/\s+@\s*$/, "").trim()}
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
      );
    }
    return map;
  }, [
    itemsForMove,
    currentKey,
    pathForMutations,
    applyMutationResult,
    refresh,
    contextSection,
    focus?.focus,
    showToast,
    openCommandPreferences,
  ]);

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
            ? errorMessage ?? "Check path and format, or run 'now status' in Terminal to see the CLI error."
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
              <PathSwitchCreateActions
                effectivePath={effectivePath}
                defaultPath={defaultPath}
                docPathForCurrent={docPathForCurrent}
                appPathForCurrent={appPathForCurrent}
                currentApp={currentApp}
                currentDocumentPath={currentDocumentPath}
                switchToGlobal={switchToGlobal}
                switchToDocument={switchToDocument}
                switchToApp={switchToApp}
                createForDocument={createForDocument}
                createForApp={createForApp}
              />
              {fileMissing ? (
                <Action
                  title="Init"
                  icon={Icon.Plus}
                  onAction={async () => {
                    try {
                      await createFocusFile(pathForMutations);
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
          actions={actionsForAdd as any}
        />
        <List.Item
          id="action-complete"
          title="Finish This"
          icon={Icon.Checkmark}
          detail={detail as any}
          actions={actionsForComplete as any}
        />
        <List.Item
          id="action-later"
          title="Add Followup"
          icon={Icon.Ellipsis}
          detail={detail as any}
          actions={actionsForLater as any}
        />
        {focus ? (
          <List.Item
            id="action-edit"
            title="Edit"
            icon={Icon.TextCursor}
            detail={detail as any}
            actions={actionsForEdit as any}
          />
        ) : null}
        <List.Item
          id="action-wrap"
          title="Wrap"
          icon={Icon.ArrowUp}
          detail={detail as any}
          actions={actionsForWrap as any}
        />
        <List.Item
          id="action-move"
          title="Move"
          icon={Icon.ArrowRight}
          detail={detail as any}
          actions={actionsForMove as any}
        />
      </List.Section>
      <List.Section title="Now File">
        <List.Item
          id="action-open-editor"
          title="Open in Editor"
          icon={Icon.Document}
          detail={detail as any}
          actions={actionsForOpenEditor as any}
        />
        {effectivePath !== defaultPath ? (
          <List.Item
            id="action-switch-global"
            title="Switch to Global"
            icon={Icon.Circle}
            detail={detail as any}
            actions={actionsForSwitchToGlobal as any}
          />
        ) : null}
        {docPathForCurrent && effectivePath !== docPathForCurrent ? (
          <List.Item
            id="action-switch-document"
            title="Switch to Document File"
            icon={Icon.Document}
            detail={detail as any}
            actions={actionsForSwitchToDocument as any}
          />
        ) : null}
        {appPathForCurrent && currentApp && effectivePath !== appPathForCurrent ? (
          <List.Item
            id="action-switch-app"
            title={`Switch to ${currentApp.name} file`}
            icon={Icon.AppWindow}
            detail={detail as any}
            actions={actionsForSwitchToApp as any}
          />
        ) : null}
        {currentDocumentPath && !docPathForCurrent ? (
          <List.Item
            id="action-create-document"
            title={`Create Now File for ${documentDisplayName(currentDocumentPath)}`}
            icon={Icon.Plus}
            detail={detail as any}
            actions={actionsForCreateDocument as any}
          />
        ) : null}
        {currentApp && !appPathForCurrent ? (
          <List.Item
            id="action-create-app"
            title={`Create Now File for ${currentApp.name}`}
            icon={Icon.Plus}
            detail={detail as any}
            actions={actionsForCreateApp as any}
          />
        ) : null}
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
                actions={actionsBySwitchItemKey[item.key] as any}
              />
            );
          })}
      </List.Section>
    </List>
  );
}
