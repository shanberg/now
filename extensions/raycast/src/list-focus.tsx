import {
  Action,
  ActionPanel,
  Form,
  getPreferenceValues,
  Icon,
  List,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createFocusFile,
  focusFileExists,
  getJsonFocus,
  getJsonItems,
  isNowOnPath,
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
import {
  addAppPathMapping,
  addDocumentPathMapping,
  setLastResolvedPath,
  setUseGlobal,
} from "./lib/nowStorage";
import { setFocusCache } from "./lib/focusCache";
import { useNowPathFromStorage } from "./lib/useNowPath";
import {
  buildPreviewMarkdown,
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

function AddNestedForm({
  nowFilePath,
  applyMutationResult,
  refresh,
}: {
  nowFilePath: string;
  applyMutationResult: (result: MutationResult) => Promise<void>;
  refresh: () => Promise<void>;
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
  refresh: () => Promise<void>;
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
  refresh: () => Promise<void>;
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
  refresh: () => Promise<void>;
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

function MoveTargetList({
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
  refresh: () => Promise<void>;
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

  useEffect(() => {
    if (!selectedTargetKey) return;
    if (movePreviewCache[selectedTargetKey]) {
      setLastShownMarkdown(movePreviewCache[selectedTargetKey]);
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
  }, [nowFilePath, selectedTargetKey, movePreviewCache]);

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

function useFocusData(nowFilePath: string | null) {
  const [focus, setFocus] = useState<JsonFocus | null>(null);
  const [items, setItems] = useState<JsonItem[] | null>(null);
  const [error, setError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  /** Pinned path: list shows and mutates this file until the user explicitly switches. Avoids path flipping when frontmost app becomes Raycast. */
  const [pinnedPath, setPinnedPath] = useState<string | null>(null);
  const effectivePath = pinnedPath ?? nowFilePath;

  const refresh = useCallback(async () => {
    if (!effectivePath) return;
    setIsLoading(true);
    setError(false);
    setErrorMessage(null);
    const [focusResult, itemsResult] = await Promise.all([
      getJsonFocus(effectivePath),
      getJsonItems(effectivePath),
    ]);
    setFocus(focusResult.data ?? null);
    setItems(itemsResult.data ?? null);
    if (focusResult.data === null && itemsResult.data === null) {
      setError(true);
      setErrorMessage(
        focusResult.error ?? itemsResult.error ?? null,
      );
    } else if (focusResult.data) {
      setPinnedPath(effectivePath);
      // #region agent log
      fetch("http://127.0.0.1:7253/ingest/fbc7b931-fa3f-4555-b420-453391a24b98", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "list-focus.tsx:refresh",
          message: "refresh writing to cache",
          data: { nowFilePath: effectivePath, hypothesisId: "B,D" },
          timestamp: Date.now(),
          sessionId: "debug-session",
        }),
      }).catch(() => {});
      // #endregion
      await setFocusCache(
        effectivePath,
        focusResult.data.focus,
        focusResult.data.breadcrumb,
        itemsResult.data ?? undefined,
      );
    }
    setIsLoading(false);
  }, [effectivePath]);

  const applyMutationResult = useCallback(
    async (result: MutationResult) => {
      // #region agent log
      fetch("http://127.0.0.1:7253/ingest/fbc7b931-fa3f-4555-b420-453391a24b98", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "list-focus.tsx:applyMutationResult",
          message: "applyMutationResult entry (path in closure)",
          data: { nowFilePathInClosure: effectivePath, resultFocusKey: result.focus?.key, hypothesisId: "A,D" },
          timestamp: Date.now(),
          sessionId: "debug-session",
        }),
      }).catch(() => {});
      // #endregion
      setFocus(result.focus);
      setItems(result.items);
      setError(false);
      setErrorMessage(null);
      await setFocusCache(
        effectivePath,
        result.focus.focus,
        result.focus.breadcrumb,
        result.items,
      );
    },
    [effectivePath],
  );

  useEffect(() => {
    if (!effectivePath) return;
    refresh();
  }, [effectivePath, refresh]);

  return { focus, items, error, errorMessage, isLoading, refresh, applyMutationResult, setPinnedPath, effectivePath };
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const defaultPath = resolveNowFilePath(prefs.focusFilePath);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const {
    nowFilePath,
    currentApp,
    currentDocumentPath,
    appPathForCurrent,
    docPathForCurrent,
    pathReady,
    refreshPathFromStorage,
  } = useNowPathFromStorage({
    defaultPath,
    appSpecificNowFiles: prefs.appSpecificNowFiles,
  });

  const { focus, items, error, errorMessage, isLoading, refresh, applyMutationResult, setPinnedPath, effectivePath } =
    useFocusData(pathReady ? nowFilePath : null);
  const [cliMissing, setCliMissing] = useState<boolean | null>(null);
  const hasDeferredOneThingSync = useRef(false);

  const currentKey = focus?.key ?? "";
  const hasItems = Array.isArray(items) && items.length > 0;
  const showEmpty = !isLoading && (error || !hasItems);
  const fileMissing = error && !focusFileExists(effectivePath ?? "");

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

  useEffect(() => {
    if (!prefs.updateOneThing || !focus?.focus) return;
    if (hasDeferredOneThingSync.current) {
      // #region agent log
      fetch("http://127.0.0.1:7253/ingest/fbc7b931-fa3f-4555-b420-453391a24b98", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "list-focus.tsx:OneThingEffect",
          message: "opening One Thing URL with focus",
          data: { nowFilePath: effectivePath, focusText: focus.focus.slice(0, 60), hypothesisId: "C" },
          timestamp: Date.now(),
          sessionId: "debug-session",
        }),
      }).catch(() => {});
      // #endregion
      open(getOneThingUrl(focus.focus));
    } else {
      hasDeferredOneThingSync.current = true;
    }
  }, [prefs.updateOneThing, focus?.focus, effectivePath]);

  useEffect(() => {
    if (!showEmpty || !error || fileMissing) {
      setCliMissing(null);
      return;
    }
    isNowOnPath().then((onPath) => setCliMissing(!onPath));
  }, [showEmpty, error, fileMissing]);

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
              {effectivePath !== defaultPath ? (
                <Action
                  title="Switch to Global"
                  icon={Icon.Circle}
                  onAction={async () => {
                    await setUseGlobal(true);
                    await refreshPathFromStorage();
                    setPinnedPath(defaultPath);
                  }}
                />
              ) : null}
              {docPathForCurrent && effectivePath !== docPathForCurrent ? (
                <Action
                  title="Switch to Document File"
                  icon={Icon.Document}
                  onAction={async () => {
                    await setUseGlobal(false);
                    await setLastResolvedPath(docPathForCurrent);
                    await refreshPathFromStorage();
                    setPinnedPath(docPathForCurrent);
                  }}
                />
              ) : null}
              {appPathForCurrent && currentApp && effectivePath !== appPathForCurrent ? (
                <Action
                  title={`Switch to ${currentApp.name} file`}
                  icon={Icon.AppWindow}
                  onAction={async () => {
                    await setUseGlobal(false);
                    await setLastResolvedPath(appPathForCurrent);
                    await refreshPathFromStorage();
                    setPinnedPath(appPathForCurrent);
                  }}
                />
              ) : null}
              {currentDocumentPath && !docPathForCurrent ? (
                <Action
                  title={`Create Now File for ${documentDisplayName(currentDocumentPath)}`}
                  icon={Icon.Plus}
                  onAction={async () => {
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
                  }}
                />
              ) : null}
              {currentApp && !appPathForCurrent ? (
                <Action
                  title={`Create Now File for ${currentApp.name}`}
                  icon={Icon.Plus}
                  onAction={async () => {
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
                  }}
                />
              ) : null}
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
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const itemKeys = new Set((items ?? []).map((i) => i.key));
  /** Prefer user's selection (stays on action after e.g. Finish This); default to current focus only when nothing selected. */
  const effectiveSelectedId =
    selectedId != null && (selectedId.startsWith("action-") || itemKeys.has(selectedId))
      ? selectedId
      : currentKey && itemKeys.has(currentKey)
        ? currentKey
        : undefined;
  const selectedKeyInTree =
    selectedId !== null && itemKeys.has(selectedId) ? selectedId : null;
  const rawAction = selectedId?.startsWith("action-")
    ? selectedId.slice(7)
    : null;
  const normalizedAction: PreviewAction =
    rawAction &&
      PREVIEW_ACTION_VALUES.includes(rawAction as (typeof PREVIEW_ACTION_VALUES)[number])
      ? (rawAction as PreviewAction)
      : null;
  const rawBreadcrumbMax =
    (prefs.breadcrumbMaxLength ?? String(DEFAULT_BREADCRUMB_MAX_LENGTH)).trim() ||
    String(DEFAULT_BREADCRUMB_MAX_LENGTH);
  const parsedBreadcrumbMax = parseInt(rawBreadcrumbMax, 10);
  const breadcrumbMaxLengthParam =
    Number.isNaN(parsedBreadcrumbMax) || parsedBreadcrumbMax <= 0
      ? undefined
      : parsedBreadcrumbMax;
  const markdown = buildPreviewMarkdown(
    items ?? [],
    currentKey,
    focus?.breadcrumb ?? "",
    focus?.focus ?? "",
    selectedKeyInTree,
    normalizedAction,
    breadcrumbMaxLengthParam,
  );
  const detail = <List.Item.Detail markdown={markdown} />;

  const hasSwitchOptions = Boolean(
    effectivePath !== defaultPath ||
    docPathForCurrent ||
    (appPathForCurrent && currentApp) ||
    (currentDocumentPath && !docPathForCurrent) ||
    (currentApp && !appPathForCurrent),
  );
  const contextSection = hasSwitchOptions ? (
    <ActionPanel.Section title={nowInputLabel}>
      {effectivePath !== defaultPath ? (
        <Action
          title="Switch to Global"
          icon={Icon.Circle}
          onAction={async () => {
            await setUseGlobal(true);
            await refreshPathFromStorage();
            setPinnedPath(defaultPath);
          }}
        />
      ) : null}
      {docPathForCurrent && effectivePath !== docPathForCurrent ? (
        <Action
          title="Switch to Document File"
          icon={Icon.Document}
          onAction={async () => {
            await setUseGlobal(false);
            await setLastResolvedPath(docPathForCurrent);
            await refreshPathFromStorage();
            setPinnedPath(docPathForCurrent);
          }}
        />
      ) : null}
      {appPathForCurrent && currentApp && effectivePath !== appPathForCurrent ? (
        <Action
          title={`Switch to ${currentApp.name} file`}
          icon={Icon.AppWindow}
          onAction={async () => {
            await setUseGlobal(false);
            await setLastResolvedPath(appPathForCurrent);
            await refreshPathFromStorage();
            setPinnedPath(appPathForCurrent);
          }}
        />
      ) : null}
      {currentDocumentPath && !docPathForCurrent ? (
        <Action
          title={`Create Now File for ${documentDisplayName(currentDocumentPath)}`}
          icon={Icon.Plus}
          onAction={async () => {
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
          }}
        />
      ) : null}
      {currentApp && !appPathForCurrent ? (
        <Action
          title={`Create Now File for ${currentApp.name}`}
          icon={Icon.Plus}
          onAction={async () => {
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
          }}
        />
      ) : null}
    </ActionPanel.Section>
  ) : null;

  const otherSection = (
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
  );

  const runNav = async (
    fn: () => Promise<MutationResult | null>,
    label: string,
  ) => {
    try {
      const result = await fn();
      if (result) await applyMutationResult(result);
      else await refresh();
      await showToast(Toast.Style.Success, label);
    } catch (e) {
      await showToast(Toast.Style.Failure, label, String(e));
    }
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder={nowInputLabel}
      selectedItemId={effectiveSelectedId}
      onSelectionChange={(id) => setSelectedId(id ?? null)}
    >
      <List.Section title="Actions">
        <List.Item
          id="action-add"
          title="Narrow Focus"
          icon={Icon.ChevronRight}
          detail={detail}
          actions={
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
          }
        />
        <List.Item
          id="action-complete"
          title="Finish This"
          icon={Icon.Checkmark}
          detail={detail}
          actions={
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
          }
        />
        <List.Item
          id="action-later"
          title="Add Followup"
          icon={Icon.Ellipsis}
          detail={detail}
          actions={
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
          }
        />
        {focus ? (
          <List.Item
            id="action-edit"
            title="Edit"
            icon={Icon.TextCursor}
            detail={detail}
            actions={
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
            }
          />
        ) : null}
        <List.Item
          id="action-wrap"
          title="Wrap"
          icon={Icon.ArrowUp}
          detail={detail}
          actions={
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
          }
        />
        <List.Item
          id="action-move"
          title="Move"
          icon={Icon.ArrowRight}
          detail={detail}
          actions={
            <ActionPanel>
              <Action.Push
                title="Move"
                icon={Icon.ArrowRight}
                target={
                  <MoveTargetList
                    nowFilePath={pathForMutations}
                    currentKey={currentKey}
                    items={items ?? []}
                    applyMutationResult={applyMutationResult}
                    refresh={refresh}
                  />
                }
              />
              {otherSection}
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Now File">
        <List.Item
          id="action-open-editor"
          title="Open in Editor"
          icon={Icon.Document}
          detail={detail}
          actions={
            <ActionPanel>
              <Action.Open
                title="Open in Editor"
                icon={Icon.Document}
                target={pathForMutations}
              />
              {otherSection}
            </ActionPanel>
          }
        />
        {currentDocumentPath && !docPathForCurrent ? (
          <List.Item
            id="action-create-document"
            title={`Create Now File for ${documentDisplayName(currentDocumentPath)}`}
            icon={Icon.Plus}
            detail={detail}
            actions={
              <ActionPanel>
                <Action
                  title={`Create Now File for ${documentDisplayName(currentDocumentPath)}`}
                  icon={Icon.Plus}
                  onAction={async () => {
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
                  }}
                />
                {otherSection}
              </ActionPanel>
            }
          />
        ) : null}
        {currentApp && !appPathForCurrent ? (
          <List.Item
            id="action-create-app"
            title={`Create Now File for ${currentApp.name}`}
            icon={Icon.Plus}
            detail={detail}
            actions={
              <ActionPanel>
                <Action
                  title={`Create Now File for ${currentApp.name}`}
                  icon={Icon.Plus}
                  onAction={async () => {
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
                  }}
                />
                {otherSection}
              </ActionPanel>
            }
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
                detail={detail}
                actions={
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
                              await showToast(
                                Toast.Style.Success,
                                "Completed",
                              );
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
                            items={items ?? []}
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
                            await showToast(
                              Toast.Style.Success,
                              "Terminal opened",
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
                        onAction={openExtensionPreferences}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
      </List.Section>
    </List>
  );
}
