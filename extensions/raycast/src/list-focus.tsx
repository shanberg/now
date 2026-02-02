import {
  Action,
  ActionPanel,
  Form,
  getFrontmostApplication,
  getPreferenceValues,
  Icon,
  List,
  LocalStorage,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  createFocusFile,
  focusFileExists,
  getCurrentDocumentPath,
  getJsonFocus,
  getJsonItems,
  isNowOnPath,
  JsonFocus,
  JsonItem,
  NOW_APP_PATHS_KEY,
  NOW_DOCUMENT_PATHS_KEY,
  NOW_INSTALL_URL,
  NOW_LAST_RESOLVED_PATH_KEY,
  NOW_USE_GLOBAL_KEY,
  openTerminalWithNowStatus,
  openTerminalWithNowTui,
  getOneThingUrl,
  resolveNowFilePath,
  resolveNowFilePathForApp,
  runAdd,
  suggestedNowPathForApp,
  suggestedNowPathForDocument,
  runComplete,
  runEdit,
  runLater,
  runMove,
  runNowInstallInTerminal,
  runSwitch,
  runWrap,
} from "./lib/now";
import {
  DATA_STR,
  getIndentFromDisplay,
  getNextFocusIndex,
  getPlaceholderLater,
  getPlaceholderNarrow,
  getPlaceholderWrap,
} from "now-format";

interface Preferences {
  focusFilePath: string;
  updateOneThing?: boolean;
  appSpecificNowFiles?: string;
}

const FOCUS_PREFIX = `${DATA_STR.focus} `;
const PREVIOUS_FOCUS_PREFIX = `${DATA_STR.focusPrevious} `;

/** Builds markdown showing all items with indentation, current focus and selected item (▶), and command-specific placeholders/indicators. */
function detailMarkdown(
  items: JsonItem[],
  currentKey: string,
  breadcrumb: string,
  currentItemName: string,
  selectedKey: string | null,
  selectedId: string | null,
): string {
  const currentIndex = items.findIndex((i) => i.key === currentKey);
  const currentIndent =
    currentIndex >= 0 ? getIndentFromDisplay(items[currentIndex].display) : "";
  const nextFocusIndex =
    selectedId === "action-complete" && currentIndex >= 0
      ? getNextFocusIndex(items, currentIndex)
      : null;

  let lines = items.map((item, index) => {
    const raw = item.display.replace(/\s+@\s*$/, "").trimEnd();
    const isCurrent = item.key === currentKey;
    const isSelected = selectedKey !== null && item.key === selectedKey;
    const isNextFocus = nextFocusIndex !== null && index === nextFocusIndex;
    let line = raw;
    if (isCurrent) {
      if (selectedId === "action-add" || selectedId === "action-later") {
        line = raw.replace(/^(\s*)(.*)$/, `$1${PREVIOUS_FOCUS_PREFIX}$2`);
      } else if (selectedKey !== null && selectedKey !== currentKey) {
        line = raw.replace(/^(\s*)(.*)$/, `$1${PREVIOUS_FOCUS_PREFIX}$2`);
      } else {
        line = raw.replace(/^(\s*)(.*)$/, `$1${FOCUS_PREFIX}$2`);
        if (selectedId === "action-complete") {
          line = line.replace(FOCUS_PREFIX, "✓ ");
        } else if (selectedId === "action-edit") {
          line = line.replace(FOCUS_PREFIX, "✎ ");
        }
      }
    } else if (isNextFocus && selectedId === "action-complete") {
      line = raw.replace(/^(\s*)(.*)$/, `$1${FOCUS_PREFIX}$2`);
    } else if (isSelected) {
      line = raw.replace(/^(\s*)(.*)$/, `$1${FOCUS_PREFIX}$2`);
    }
    return line;
  });

  if (selectedId === "action-add" && currentIndex >= 0) {
    const placeholder = getPlaceholderNarrow(currentIndent);
    lines = [
      ...lines.slice(0, currentIndex + 1),
      placeholder,
      ...lines.slice(currentIndex + 1),
    ];
  }

  if (selectedId === "action-later" && currentIndex >= 0) {
    const placeholder = getPlaceholderLater(currentIndent);
    lines = [
      ...lines.slice(0, currentIndex + 1),
      placeholder,
      ...lines.slice(currentIndex + 1),
    ];
  }

  if (selectedId === "action-wrap" && currentIndex >= 0) {
    const { wrapParentLine, indentedCurrentLine } = getPlaceholderWrap(
      currentIndent,
      lines[currentIndex],
    );
    lines = [
      ...lines.slice(0, currentIndex),
      wrapParentLine,
      indentedCurrentLine,
      ...lines.slice(currentIndex + 1),
    ];
  }

  const line1 = breadcrumb || "";
  const line2 = `${DATA_STR.focus} **${currentItemName || "—"}**`;
  const header =
    (line1 ? line1 + "\n\n" : "") + line2 + "\n\n";
  return header + "```\n" + lines.join("\n") + "\n```";
}

function AddNestedForm({
  nowFilePath,
  refresh,
}: {
  nowFilePath: string;
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
                await runAdd(nowFilePath, items);
                await showToast(Toast.Style.Success, "Added");
                await refresh();
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
  refresh,
}: {
  nowFilePath: string;
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
                await runLater(nowFilePath, items);
                await showToast(Toast.Style.Success, "Added");
                await refresh();
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
  refresh,
}: {
  nowFilePath: string;
  currentName: string;
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
                await runEdit(nowFilePath, newName);
                await showToast(Toast.Style.Success, "Updated");
                await refresh();
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
  refresh,
}: {
  nowFilePath: string;
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
                await runWrap(nowFilePath, parentName);
                await showToast(Toast.Style.Success, "Wrapped");
                await refresh();
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
  refresh,
}: {
  nowFilePath: string;
  currentKey: string;
  items: JsonItem[];
  refresh: () => Promise<void>;
}) {
  const { pop } = useNavigation();
  const targets = items.filter((item) => item.key !== currentKey);
  return (
    <List navigationTitle="Move to…" searchBarPlaceholder="Select new parent">
      {targets.map((item) => (
        <List.Item
          key={item.key}
          id={item.key}
          title={item.display.trim()}
          actions={
            <ActionPanel>
              <Action
                title="Move Here"
                icon={Icon.ArrowRight}
                onAction={async () => {
                  try {
                    await runMove(nowFilePath, item.key);
                    await showToast(Toast.Style.Success, "Moved");
                    await refresh();
                    pop();
                  } catch (e) {
                    await showToast(Toast.Style.Failure, "Failed", String(e));
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function useFocusData(nowFilePath: string) {
  const [focus, setFocus] = useState<JsonFocus | null>(null);
  const [items, setItems] = useState<JsonItem[] | null>(null);
  const [error, setError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(false);
    setErrorMessage(null);
    const [focusResult, itemsResult] = await Promise.all([
      getJsonFocus(nowFilePath),
      getJsonItems(nowFilePath),
    ]);
    setFocus(focusResult.data ?? null);
    setItems(itemsResult.data ?? null);
    if (focusResult.data === null && itemsResult.data === null) {
      setError(true);
      setErrorMessage(
        focusResult.error ?? itemsResult.error ?? null,
      );
    }
    setIsLoading(false);
  }, [nowFilePath]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { focus, items, error, errorMessage, isLoading, refresh };
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const defaultPath = resolveNowFilePath(prefs.focusFilePath);
  const [nowFilePath, setNowFilePath] = useState<string>(defaultPath);
  const [sourceLabel, setSourceLabel] = useState<string>("Global");
  const [currentApp, setCurrentApp] = useState<{ name: string; bundleId?: string } | null>(null);
  const [appPathForCurrent, setAppPathForCurrent] = useState<string | null>(null);
  const [currentDocumentPath, setCurrentDocumentPath] = useState<string | null>(null);
  const [docPathForCurrent, setDocPathForCurrent] = useState<string | null>(null);

  const isUsingAppFile = nowFilePath !== defaultPath;

  const refreshPathFromStorage = useCallback(async () => {
    const useGlobal = (await LocalStorage.getItem<string>(NOW_USE_GLOBAL_KEY)) === "true";
    const docPathsJson = (await LocalStorage.getItem<string>(NOW_DOCUMENT_PATHS_KEY)) ?? "{}";
    let docPaths: Record<string, string>;
    try {
      docPaths = (JSON.parse(docPathsJson) as Record<string, string>) ?? {};
    } catch {
      docPaths = {};
    }
    const localPathsJson = (await LocalStorage.getItem<string>(NOW_APP_PATHS_KEY)) ?? "{}";
    let localPaths: Record<string, string> = {};
    try {
      localPaths = JSON.parse(localPathsJson) as Record<string, string>;
    } catch {
      localPaths = {};
    }
    const prefsJson = prefs.appSpecificNowFiles?.trim() ?? "{}";
    let prefsMap: Record<string, string> = {};
    try {
      prefsMap = JSON.parse(prefsJson) as Record<string, string>;
    } catch {
      prefsMap = {};
    }
    const mergedAppJson = JSON.stringify({ ...prefsMap, ...localPaths });

    const [docPath, app] = await Promise.all([
      getCurrentDocumentPath(),
      getFrontmostApplication().catch(() => null),
    ]);
    setCurrentDocumentPath(docPath ?? null);
    setCurrentApp(app ? { name: app.name, bundleId: app.bundleId } : null);

    const docPathResolved =
      docPath && docPaths[docPath]
        ? resolveNowFilePath(docPaths[docPath])
        : null;
    setDocPathForCurrent(docPathResolved);

    if (useGlobal) {
      setNowFilePath(defaultPath);
      setSourceLabel("Global");
      setAppPathForCurrent(
        app
          ? (() => {
              let map: Record<string, string> = {};
              try {
                map = JSON.parse(mergedAppJson) as Record<string, string>;
              } catch {}
              const key = app.bundleId ?? app.name;
              const raw = map[key];
              return raw ? resolveNowFilePath(raw) : null;
            })()
          : null,
      );
      return;
    }

    if (docPathResolved) {
      setNowFilePath(docPathResolved);
      setSourceLabel(`Document — ${docPath}`);
      await LocalStorage.setItem(NOW_LAST_RESOLVED_PATH_KEY, docPathResolved);
      setAppPathForCurrent(
        app
          ? (() => {
              let map: Record<string, string> = {};
              try {
                map = JSON.parse(mergedAppJson) as Record<string, string>;
              } catch {}
              const key = app.bundleId ?? app.name;
              const raw = map[key];
              return raw ? resolveNowFilePath(raw) : null;
            })()
          : null,
      );
      return;
    }

    if (app) {
      const path = resolveNowFilePathForApp(
        prefs.focusFilePath,
        mergedAppJson,
        { bundleId: app.bundleId, name: app.name },
      );
      const key = app.bundleId ?? app.name;
      let map: Record<string, string> = {};
      try {
        map = JSON.parse(mergedAppJson) as Record<string, string>;
      } catch {}
      const rawForApp = map[key];
      setAppPathForCurrent(rawForApp ? resolveNowFilePath(rawForApp) : null);
      setNowFilePath(path);
      setSourceLabel(path !== defaultPath ? `${app.name} — ${path}` : "Global");
      if (path !== defaultPath) {
        await LocalStorage.setItem(NOW_LAST_RESOLVED_PATH_KEY, path);
      }
      return;
    }

    const lastPath = await LocalStorage.getItem<string>(NOW_LAST_RESOLVED_PATH_KEY);
    if (lastPath) {
      setAppPathForCurrent(null);
      setNowFilePath(lastPath);
      setSourceLabel(`Last used — ${lastPath}`);
    } else {
      setAppPathForCurrent(null);
      setNowFilePath(defaultPath);
      setSourceLabel("Global");
    }
  }, [defaultPath, prefs.focusFilePath, prefs.appSpecificNowFiles]);

  useEffect(() => {
    let cancelled = false;
    refreshPathFromStorage().then(() => {
      if (!cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [refreshPathFromStorage]);

  const { focus, items, error, errorMessage, isLoading, refresh } =
    useFocusData(nowFilePath);
  const [cliMissing, setCliMissing] = useState<boolean | null>(null);

  const currentKey = focus?.key ?? "";
  const hasItems = Array.isArray(items) && items.length > 0;
  const showEmpty = !isLoading && (error || !hasItems);
  const fileMissing = error && !focusFileExists(nowFilePath);

  useEffect(() => {
    if (!prefs.updateOneThing || !focus?.focus) return;
    open(getOneThingUrl(focus.focus));
  }, [prefs.updateOneThing, focus?.focus]);

  useEffect(() => {
    if (!showEmpty || !error || fileMissing) {
      setCliMissing(null);
      return;
    }
    isNowOnPath().then((onPath) => setCliMissing(!onPath));
  }, [showEmpty, error, fileMissing]);

  if (showEmpty) {
    const emptyDescription =
      (fileMissing
        ? "Create a new focus file to get started."
        : cliMissing
          ? "Install the now CLI to use this extension."
          : error
            ? errorMessage ?? "Check path and format, or run 'now status' in Terminal to see the CLI error."
            : "Set your focus file path in extension preferences and ensure the now CLI is installed.") +
      `\n\nUsing: ${sourceLabel}`;
    return (
      <List isLoading={isLoading} searchBarPlaceholder={`Using: ${sourceLabel}`}>
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
              {isUsingAppFile ? (
                <Action
                  title="Use global file"
                  icon={Icon.Circle}
                  onAction={async () => {
                    await LocalStorage.setItem(NOW_USE_GLOBAL_KEY, "true");
                    await refreshPathFromStorage();
                    await refresh();
                  }}
                />
              ) : null}
              {docPathForCurrent && nowFilePath !== docPathForCurrent ? (
                <Action
                  title="Use document file"
                  icon={Icon.Circle}
                  onAction={async () => {
                    await LocalStorage.setItem(NOW_USE_GLOBAL_KEY, "false");
                    await LocalStorage.setItem(NOW_LAST_RESOLVED_PATH_KEY, docPathForCurrent);
                    setNowFilePath(docPathForCurrent);
                    setSourceLabel(currentDocumentPath ? `Document — ${currentDocumentPath}` : "Document");
                    await refresh();
                  }}
                />
              ) : null}
              {appPathForCurrent && currentApp && nowFilePath !== appPathForCurrent ? (
                <Action
                  title="Use app file"
                  icon={Icon.Circle}
                  onAction={async () => {
                    await LocalStorage.setItem(NOW_USE_GLOBAL_KEY, "false");
                    await LocalStorage.setItem(NOW_LAST_RESOLVED_PATH_KEY, appPathForCurrent);
                    setNowFilePath(appPathForCurrent);
                    setSourceLabel(`${currentApp.name} — ${appPathForCurrent}`);
                    await refresh();
                  }}
                />
              ) : null}
              {currentDocumentPath ? (
                <Action
                  title="Create Now File for Current Document"
                  icon={Icon.Plus}
                  onAction={async () => {
                    const path = resolveNowFilePath(suggestedNowPathForDocument(currentDocumentPath));
                    try {
                      await createFocusFile(path);
                      const existing = await LocalStorage.getItem<string>(NOW_DOCUMENT_PATHS_KEY);
                      let map: Record<string, string> = {};
                      try {
                        if (existing) map = JSON.parse(existing) as Record<string, string>;
                      } catch {}
                      map[currentDocumentPath] = suggestedNowPathForDocument(currentDocumentPath);
                      await LocalStorage.setItem(NOW_DOCUMENT_PATHS_KEY, JSON.stringify(map));
                      await LocalStorage.setItem(NOW_USE_GLOBAL_KEY, "false");
                      setNowFilePath(path);
                      setDocPathForCurrent(path);
                      setSourceLabel(`Document — ${currentDocumentPath}`);
                      await showToast(Toast.Style.Success, "Created and using for current document");
                      await refresh();
                    } catch (e) {
                      await showToast(Toast.Style.Failure, "Failed to create file", String(e));
                    }
                  }}
                />
              ) : null}
              {currentApp ? (
                <Action
                  title={`Create Now File for ${currentApp.name}`}
                  icon={Icon.Plus}
                  onAction={async () => {
                    const path = resolveNowFilePath(suggestedNowPathForApp(currentApp));
                    try {
                      await createFocusFile(path);
                      const key = currentApp.bundleId ?? currentApp.name;
                      const existing = await LocalStorage.getItem<string>(NOW_APP_PATHS_KEY);
                      let map: Record<string, string> = {};
                      try {
                        if (existing) map = JSON.parse(existing) as Record<string, string>;
                      } catch {}
                      map[key] = suggestedNowPathForApp(currentApp);
                      await LocalStorage.setItem(NOW_APP_PATHS_KEY, JSON.stringify(map));
                      await LocalStorage.setItem(NOW_USE_GLOBAL_KEY, "false");
                      setNowFilePath(path);
                      setSourceLabel(`${currentApp.name} — ${path}`);
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
                      await createFocusFile(nowFilePath);
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
                      await openTerminalWithNowStatus(nowFilePath);
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
                    await openTerminalWithNowTui(nowFilePath);
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
                target={nowFilePath}
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

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const itemKeys = new Set((items ?? []).map((i) => i.key));
  const selectedKeyInTree =
    selectedId !== null && itemKeys.has(selectedId) ? selectedId : null;
  const markdown = detailMarkdown(
    items ?? [],
    currentKey,
    focus?.breadcrumb ?? "",
    focus?.focus ?? "",
    selectedKeyInTree,
    selectedId,
  );
  const detail = <List.Item.Detail markdown={markdown} />;

  const contextSection =
    isUsingAppFile || docPathForCurrent || (appPathForCurrent && currentApp) || currentDocumentPath ? (
      <ActionPanel.Section title={`Using: ${sourceLabel}`}>
        {isUsingAppFile ? (
          <Action
            title="Use global file"
            icon={Icon.Circle}
            onAction={async () => {
              await LocalStorage.setItem(NOW_USE_GLOBAL_KEY, "true");
              await refreshPathFromStorage();
              await refresh();
            }}
          />
        ) : null}
        {docPathForCurrent && nowFilePath !== docPathForCurrent ? (
          <Action
            title="Use document file"
            icon={Icon.Circle}
            onAction={async () => {
              await LocalStorage.setItem(NOW_USE_GLOBAL_KEY, "false");
              setNowFilePath(docPathForCurrent);
              setSourceLabel(currentDocumentPath ? `Document — ${currentDocumentPath}` : "Document");
              await refresh();
            }}
          />
        ) : null}
        {appPathForCurrent && currentApp && nowFilePath !== appPathForCurrent ? (
          <Action
            title="Use app file"
            icon={Icon.Circle}
            onAction={async () => {
              await LocalStorage.setItem(NOW_USE_GLOBAL_KEY, "false");
              setNowFilePath(appPathForCurrent);
              setSourceLabel(`${currentApp.name} — ${appPathForCurrent}`);
              await refresh();
            }}
          />
        ) : null}
        {currentDocumentPath && nowFilePath !== docPathForCurrent ? (
          <Action
            title="Create Now File for Current Document"
            icon={Icon.Plus}
            onAction={async () => {
              const path = resolveNowFilePath(suggestedNowPathForDocument(currentDocumentPath));
              try {
                await createFocusFile(path);
                const existing = await LocalStorage.getItem<string>(NOW_DOCUMENT_PATHS_KEY);
                let map: Record<string, string> = {};
                try {
                  if (existing) map = JSON.parse(existing) as Record<string, string>;
                } catch {}
                map[currentDocumentPath] = suggestedNowPathForDocument(currentDocumentPath);
                await LocalStorage.setItem(NOW_DOCUMENT_PATHS_KEY, JSON.stringify(map));
                await LocalStorage.setItem(NOW_USE_GLOBAL_KEY, "false");
                setNowFilePath(path);
                setDocPathForCurrent(path);
                setSourceLabel(`Document — ${currentDocumentPath}`);
                await showToast(Toast.Style.Success, "Created and using for current document");
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
              await openTerminalWithNowTui(nowFilePath);
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
          target={nowFilePath}
        />
        <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
      </ActionPanel.Section>
    </>
  );

  const runNav = async (
    fn: () => Promise<void>,
    label: string,
  ) => {
    try {
      await fn();
      await showToast(Toast.Style.Success, label);
      await refresh();
    } catch (e) {
      await showToast(Toast.Style.Failure, label, String(e));
    }
  };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="Focus List"
      searchBarPlaceholder={`Using: ${sourceLabel}`}
      selectedItemId={
        currentKey && items?.some((i) => i.key === currentKey)
          ? currentKey
          : undefined
      }
      onSelectionChange={(id) => setSelectedId(id ?? null)}
    >
      <List.Section title="Actions">
        <List.Item
          id="action-add"
          title="Narrow focus"
          icon={Icon.ChevronRight}
          detail={detail}
          actions={
            <ActionPanel>
              <Action.Push
                title="Narrow focus"
                icon={Icon.ChevronRight}
                target={
                  <AddNestedForm
                    nowFilePath={nowFilePath}
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
          title="Finish this"
          icon={Icon.Checkmark}
          detail={detail}
          actions={
            <ActionPanel>
              <Action
                title="Finish this"
                icon={Icon.Checkmark}
                onAction={async () =>
                  runNav(() => runComplete(nowFilePath), "Completed")
                }
              />
              {otherSection}
            </ActionPanel>
          }
        />
        <List.Item
          id="action-later"
          title="Add followup"
          icon={Icon.Ellipsis}
          detail={detail}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add followup"
                icon={Icon.Ellipsis}
                target={
                  <LaterForm
                    nowFilePath={nowFilePath}
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
                      nowFilePath={nowFilePath}
                      currentName={focus.focus}
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
                    nowFilePath={nowFilePath}
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
                    nowFilePath={nowFilePath}
                    currentKey={currentKey}
                    items={items ?? []}
                    refresh={refresh}
                  />
                }
              />
              {otherSection}
            </ActionPanel>
          }
        />
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
                  <ActionPanel.Section title="Focus">
                    <Action
                      title="Switch"
                      icon={Icon.Star}
                      onAction={async () => {
                        try {
                          await runSwitch(nowFilePath, item.key);
                          await showToast(Toast.Style.Success, "Focus updated");
                          await refresh();
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
                        title="Finish this"
                        icon={Icon.Checkmark}
                        onAction={async () => {
                          try {
                            await runComplete(nowFilePath);
                            await showToast(
                              Toast.Style.Success,
                              "Completed",
                            );
                            await refresh();
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
                      title="Narrow focus"
                      icon={Icon.ChevronRight}
                      target={
                        <AddNestedForm
                          nowFilePath={nowFilePath}
                          refresh={refresh}
                        />
                      }
                    />
                    <Action.Push
                      title="Add followup"
                      icon={Icon.Ellipsis}
                      target={
                        <LaterForm
                          nowFilePath={nowFilePath}
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
                            nowFilePath={nowFilePath}
                            currentName={focus.focus}
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
                          nowFilePath={nowFilePath}
                          refresh={refresh}
                        />
                      }
                    />
                    <Action.Push
                      title="Move"
                      icon={Icon.ArrowRight}
                      target={
                        <MoveTargetList
                          nowFilePath={nowFilePath}
                          currentKey={currentKey}
                          items={items ?? []}
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
                          await openTerminalWithNowTui(nowFilePath);
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
                      target={nowFilePath}
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
