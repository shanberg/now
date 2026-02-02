import {
  getFrontmostApplication,
  getPreferenceValues,
  LocalStorage,
  MenuBarExtra,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  createFocusFile,
  focusFileExists,
  getCurrentDocumentPath,
  getJsonFocus,
  getOneThingUrl,
  isNowOnPath,
  NOW_APP_PATHS_KEY,
  NOW_DOCUMENT_PATHS_KEY,
  NOW_INSTALL_URL,
  NOW_LAST_RESOLVED_PATH_KEY,
  NOW_USE_GLOBAL_KEY,
  openTerminalWithNowStatus,
  resolveNowFilePath,
  resolveNowFilePathForApp,
  resolveNowFilePathForDocument,
  runNowInstallInTerminal,
  suggestedNowPathForApp,
  suggestedNowPathForDocument,
} from "./lib/now";

interface Preferences {
  focusFilePath: string;
  updateOneThing?: boolean;
  appSpecificNowFiles?: string;
  menubarTruncateLength?: string;
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const defaultPath = resolveNowFilePath(prefs.focusFilePath);
  const [nowFilePath, setNowFilePath] = useState<string>(defaultPath);
  const [sourceLabel, setSourceLabel] = useState<string>("Global");
  const [currentApp, setCurrentApp] = useState<{
    name: string;
    bundleId?: string;
  } | null>(null);
  /** When on global, this is the app-specific path for current app if any. */
  const [appPathForCurrent, setAppPathForCurrent] = useState<string | null>(null);
  /** Current document path from frontmost app (for document-specific and Create for document). */
  const [currentDocumentPath, setCurrentDocumentPath] = useState<string | null>(null);
  /** When on global, the now file path for current document if in mapping. */
  const [docPathForCurrent, setDocPathForCurrent] = useState<string | null>(null);
  const [focus, setFocus] = useState<{
    focus: string;
    breadcrumb: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cliMissing, setCliMissing] = useState<boolean | null>(null);
  const [storageReady, setStorageReady] = useState(false);

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
    let localPaths: Record<string, string>;
    try {
      localPaths = JSON.parse(localPathsJson) as Record<string, string>;
    } catch {
      localPaths = {};
    }
    const prefsJson = prefs.appSpecificNowFiles?.trim() ?? "{}";
    let prefsMap: Record<string, string>;
    try {
      prefsMap = (JSON.parse(prefsJson) as Record<string, string>) ?? {};
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
      setStorageReady(true);
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
      setStorageReady(true);
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
      setStorageReady(true);
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
    setStorageReady(true);
  }, [defaultPath, prefs.focusFilePath, prefs.appSpecificNowFiles]);

  useEffect(() => {
    let cancelled = false;
    refreshPathFromStorage().then(() => {
      if (!cancelled) setStorageReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshPathFromStorage]);

  useEffect(() => {
    if (!storageReady) return;
    let cancelled = false;
    setIsLoading(true);
    getJsonFocus(nowFilePath).then((result) => {
      if (!cancelled) {
        setFocus(
          result.data
            ? { focus: result.data.focus, breadcrumb: result.data.breadcrumb }
            : null,
        );
        setErrorMessage(result.error ?? null);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [nowFilePath, storageReady]);

  useEffect(() => {
    if (prefs.updateOneThing && focus?.focus) {
      open(getOneThingUrl(focus.focus));
    }
  }, [prefs.updateOneThing, focus?.focus]);

  useEffect(() => {
    if (focus !== null) {
      setCliMissing(null);
      return;
    }
    if (!isLoading) {
      isNowOnPath().then((onPath) => setCliMissing(!onPath));
    }
  }, [focus, isLoading]);

  if (!storageReady || isLoading) {
    return (
      <MenuBarExtra isLoading tooltip="Now focus">
        <MenuBarExtra.Item title="Loading…" />
      </MenuBarExtra>
    );
  }

  if (!focus) {
    const fileMissing = !focusFileExists(nowFilePath);
    return (
      <MenuBarExtra
        tooltip={
          fileMissing
            ? "No focus file at path"
            : cliMissing
              ? "now CLI not installed"
              : errorMessage ?? "Could not read focus file"
        }
      >
        <MenuBarExtra.Item title={`Using: ${sourceLabel}`} />
        {isUsingAppFile ? (
          <MenuBarExtra.Item
            title="Use global file"
            onAction={async () => {
              await LocalStorage.setItem(NOW_USE_GLOBAL_KEY, "true");
              setNowFilePath(defaultPath);
              setSourceLabel("Global");
              refreshPathFromStorage();
            }}
          />
        ) : docPathForCurrent ? (
          <MenuBarExtra.Item
            title="Use document file"
            onAction={async () => {
              await LocalStorage.setItem(NOW_USE_GLOBAL_KEY, "false");
              await LocalStorage.setItem(NOW_LAST_RESOLVED_PATH_KEY, docPathForCurrent);
              setNowFilePath(docPathForCurrent);
              setSourceLabel(currentDocumentPath ? `Document — ${currentDocumentPath}` : "Document");
              const result = await getJsonFocus(docPathForCurrent);
              if (result.data) {
                setFocus({
                  focus: result.data.focus,
                  breadcrumb: result.data.breadcrumb,
                });
              }
            }}
          />
        ) : null}
        {currentApp && nowFilePath !== appPathForCurrent && appPathForCurrent ? (
          <MenuBarExtra.Item
            title="Use app file"
            onAction={async () => {
              await LocalStorage.setItem(NOW_USE_GLOBAL_KEY, "false");
              await LocalStorage.setItem(NOW_LAST_RESOLVED_PATH_KEY, appPathForCurrent);
              setNowFilePath(appPathForCurrent);
              setSourceLabel(`${currentApp.name} — ${appPathForCurrent}`);
              const result = await getJsonFocus(appPathForCurrent);
              if (result.data) {
                setFocus({
                  focus: result.data.focus,
                  breadcrumb: result.data.breadcrumb,
                });
              }
            }}
          />
        ) : null}
        {currentDocumentPath ? (
          <MenuBarExtra.Item
            title="Create Now File for Current Document"
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
                const result = await getJsonFocus(path);
                if (result.data) {
                  setFocus({
                    focus: result.data.focus,
                    breadcrumb: result.data.breadcrumb,
                  });
                }
              } catch (e) {
                await showToast(Toast.Style.Failure, "Failed to create file", String(e));
              }
            }}
          />
        ) : null}
        {currentApp ? (
          <MenuBarExtra.Item
            title={`Create Now File for ${currentApp.name}`}
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
                setAppPathForCurrent(path);
                await showToast(Toast.Style.Success, `Created and using for ${currentApp.name}`);
                const result = await getJsonFocus(path);
                if (result.data) {
                  setFocus({
                    focus: result.data.focus,
                    breadcrumb: result.data.breadcrumb,
                  });
                }
              } catch (e) {
                await showToast(Toast.Style.Failure, "Failed to create file", String(e));
              }
            }}
          />
        ) : null}
        <MenuBarExtra.Item title="No focus" />
        {fileMissing ? (
          <MenuBarExtra.Item
            title="Create Focus File"
            onAction={async () => {
              try {
                await createFocusFile(nowFilePath);
                // Brief delay so the file is flushed before the CLI reads it
                await new Promise((r) => setTimeout(r, 100));
                const result = await getJsonFocus(nowFilePath);
                if (result.data) {
                  setFocus({
                    focus: result.data.focus,
                    breadcrumb: result.data.breadcrumb,
                  });
                }
              } catch {
                // Keep empty state
              }
            }}
          />
        ) : null}
        {cliMissing === true ? (
          <>
            <MenuBarExtra.Item
              title="Install Now CLI in Terminal…"
              onAction={async () => {
                try {
                  await runNowInstallInTerminal();
                } catch {
                  await open(NOW_INSTALL_URL);
                }
              }}
            />
            <MenuBarExtra.Item
              title="Open Install Instructions…"
              onAction={() => open(NOW_INSTALL_URL)}
            />
          </>
        ) : !fileMissing ? (
          <MenuBarExtra.Item
            title="Run 'now status' in Terminal…"
            onAction={async () => {
              try {
                await openTerminalWithNowStatus(nowFilePath);
              } catch {
                // Keep empty state
              }
            }}
          />
        ) : null}
        <MenuBarExtra.Item
          title="Open Extension Preferences…"
          onAction={openExtensionPreferences}
        />
      </MenuBarExtra>
    );
  }

  const rawTitle = focus.focus || "—";
  const truncateLen = Math.max(0, parseInt(prefs.menubarTruncateLength ?? "0", 10) || 0);
  const title =
    truncateLen > 0 && rawTitle.length > truncateLen
      ? rawTitle.slice(0, truncateLen) + "…"
      : rawTitle;
  return (
    <MenuBarExtra
      title={title}
      tooltip={isUsingAppFile ? `${focus.breadcrumb || title} (${sourceLabel})` : focus.breadcrumb || title}
    >
      <MenuBarExtra.Item title={`Using: ${sourceLabel}`} />
      {isUsingAppFile ? (
        <MenuBarExtra.Item
          title="Use global file"
          onAction={async () => {
            await LocalStorage.setItem(NOW_USE_GLOBAL_KEY, "true");
            setNowFilePath(defaultPath);
            setSourceLabel("Global");
            refreshPathFromStorage();
          }}
        />
      ) : null}
      {docPathForCurrent && nowFilePath !== docPathForCurrent ? (
        <MenuBarExtra.Item
          title="Use document file"
          onAction={async () => {
            await LocalStorage.setItem(NOW_USE_GLOBAL_KEY, "false");
            setNowFilePath(docPathForCurrent);
            setSourceLabel(currentDocumentPath ? `Document — ${currentDocumentPath}` : "Document");
            const result = await getJsonFocus(docPathForCurrent);
            if (result.data) {
              setFocus({
                focus: result.data.focus,
                breadcrumb: result.data.breadcrumb,
              });
            }
          }}
        />
      ) : null}
      {appPathForCurrent && currentApp && nowFilePath !== appPathForCurrent ? (
        <MenuBarExtra.Item
          title="Use app file"
          onAction={async () => {
            await LocalStorage.setItem(NOW_USE_GLOBAL_KEY, "false");
            setNowFilePath(appPathForCurrent);
            setSourceLabel(`${currentApp.name} — ${appPathForCurrent}`);
            const result = await getJsonFocus(appPathForCurrent);
            if (result.data) {
              setFocus({
                focus: result.data.focus,
                breadcrumb: result.data.breadcrumb,
              });
            }
          }}
        />
      ) : null}
      {currentDocumentPath && nowFilePath !== docPathForCurrent ? (
        <MenuBarExtra.Item
          title="Create Now File for Current Document"
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
              const result = await getJsonFocus(path);
              if (result.data) {
                setFocus({
                  focus: result.data.focus,
                  breadcrumb: result.data.breadcrumb,
                });
              }
            } catch (e) {
              await showToast(Toast.Style.Failure, "Failed to create file", String(e));
            }
          }}
        />
      ) : null}
      <MenuBarExtra.Item title={focus.focus || "—"} />
      {focus.breadcrumb ? <MenuBarExtra.Item title={focus.breadcrumb} /> : null}
      <MenuBarExtra.Item
        title="Open Extension Preferences…"
        onAction={openExtensionPreferences}
      />
    </MenuBarExtra>
  );
}
