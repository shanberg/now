import {
  getPreferenceValues,
  Icon,
  MenuBarExtra,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { DATA_STR, truncateBreadcrumb } from "now-format";
import {
  createFocusFile,
  focusFileExists,
  getJsonFocus,
  documentDisplayName,
  getOneThingUrl,
  isNowOnPath,
  NOW_INSTALL_URL,
  openTerminalWithNowStatus,
  resolveNowFilePath,
  runComplete,
  runNowInstallInTerminal,
  suggestedNowPathForApp,
  suggestedNowPathForDocument,
} from "./lib/now";
import {
  addAppPathMapping,
  addDocumentPathMapping,
  setLastResolvedPath,
  setUseGlobal,
} from "./lib/nowStorage";
import { getFocusCache, setFocusCache } from "./lib/focusCache";
import { useNowPathFromStorage } from "./lib/useNowPath";

const FOCUS_LIST_DEEPLINK = "raycast://extensions/shanberg/now/list-focus";

interface Preferences {
  focusFilePath: string;
  updateOneThing?: boolean;
  appSpecificNowFiles?: string;
  menubarTruncateLength?: string;
  breadcrumbMaxLength?: string;
}

interface PathActionsMenuSectionProps {
  nowFilePath: string;
  defaultPath: string;
  currentDocumentPath: string | null;
  docPathForCurrent: string | null;
  currentApp: { name: string; bundleId?: string } | null;
  appPathForCurrent: string | null;
  refreshPathFromStorage: () => Promise<void>;
  setFocus: (focus: { focus: string; breadcrumb: string } | null) => void;
  setFocusCache: (path: string, focus: string, breadcrumb: string) => Promise<void>;
  setNowFilePath: (path: string) => void;
  setSourceLabel: (label: string) => void;
}

function PathActionsMenuSection({
  nowFilePath,
  defaultPath,
  currentDocumentPath,
  docPathForCurrent,
  currentApp,
  appPathForCurrent,
  refreshPathFromStorage,
  setFocus,
  setFocusCache,
  setNowFilePath,
  setSourceLabel,
}: PathActionsMenuSectionProps) {
  return (
    <>
      {currentDocumentPath && !docPathForCurrent ? (
        <MenuBarExtra.Item
          title={`Create Now File for ${documentDisplayName(currentDocumentPath)}`}
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
              await showToast(Toast.Style.Success, "Created and using for current document");
              const result = await getJsonFocus(path);
              if (result.data) {
                setFocus({
                  focus: result.data.focus,
                  breadcrumb: result.data.breadcrumb,
                });
                await setFocusCache(path, result.data.focus, result.data.breadcrumb);
              }
            } catch (e) {
              await showToast(Toast.Style.Failure, "Failed to create file", String(e));
            }
          }}
        />
      ) : null}
      {currentApp && !appPathForCurrent ? (
        <MenuBarExtra.Item
          title={`Create Now File for ${currentApp.name}`}
          onAction={async () => {
            const path = resolveNowFilePath(suggestedNowPathForApp(currentApp));
            try {
              await createFocusFile(path, currentApp.name);
              const key = currentApp.bundleId ?? currentApp.name;
              await addAppPathMapping(key, suggestedNowPathForApp(currentApp));
              await setUseGlobal(false);
              await refreshPathFromStorage();
              await showToast(Toast.Style.Success, `Created and using for ${currentApp.name}`);
              const result = await getJsonFocus(path);
              if (result.data) {
                setFocus({
                  focus: result.data.focus,
                  breadcrumb: result.data.breadcrumb,
                });
                await setFocusCache(path, result.data.focus, result.data.breadcrumb);
              }
            } catch (e) {
              await showToast(Toast.Style.Failure, "Failed to create file", String(e));
            }
          }}
        />
      ) : null}
      {nowFilePath !== defaultPath ? (
        <MenuBarExtra.Item
          title="Switch to Global"
          onAction={async () => {
            await setUseGlobal(true);
            await refreshPathFromStorage();
          }}
        />
      ) : null}
      {docPathForCurrent && nowFilePath !== docPathForCurrent ? (
        <MenuBarExtra.Item
          title="Switch to Document file"
          onAction={async () => {
            await setUseGlobal(false);
            await setLastResolvedPath(docPathForCurrent);
            setNowFilePath(docPathForCurrent);
            setSourceLabel(currentDocumentPath ? `Document — ${currentDocumentPath}` : "Document");
            const result = await getJsonFocus(docPathForCurrent);
            if (result.data) {
              setFocus({
                focus: result.data.focus,
                breadcrumb: result.data.breadcrumb,
              });
              await setFocusCache(docPathForCurrent, result.data.focus, result.data.breadcrumb);
            }
          }}
        />
      ) : null}
      {appPathForCurrent && currentApp && nowFilePath !== appPathForCurrent ? (
        <MenuBarExtra.Item
          title={`Switch to ${currentApp.name} file`}
          onAction={async () => {
            await setUseGlobal(false);
            await setLastResolvedPath(appPathForCurrent);
            setNowFilePath(appPathForCurrent);
            setSourceLabel(`${currentApp.name} — ${appPathForCurrent}`);
            const result = await getJsonFocus(appPathForCurrent);
            if (result.data) {
              setFocus({
                focus: result.data.focus,
                breadcrumb: result.data.breadcrumb,
              });
              await setFocusCache(appPathForCurrent, result.data.focus, result.data.breadcrumb);
            }
          }}
        />
      ) : null}
    </>
  );
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const defaultPath = resolveNowFilePath(prefs.focusFilePath);
  const [focus, setFocus] = useState<{
    focus: string;
    breadcrumb: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cliMissing, setCliMissing] = useState<boolean | null>(null);

  const {
    nowFilePath,
    setNowFilePath,
    sourceLabel,
    setSourceLabel,
    currentApp,
    currentDocumentPath,
    appPathForCurrent,
    docPathForCurrent,
    pathReady: storageReady,
    refreshPathFromStorage,
  } = useNowPathFromStorage({
    defaultPath,
    appSpecificNowFiles: prefs.appSpecificNowFiles,
  });

  const isUsingAppFile = nowFilePath !== defaultPath;

  const nowInputLabel =
    nowFilePath === defaultPath
      ? "Now"
      : docPathForCurrent && nowFilePath === docPathForCurrent && currentDocumentPath
        ? `Now: ${documentDisplayName(currentDocumentPath)}`
        : appPathForCurrent && nowFilePath === appPathForCurrent && currentApp
          ? `Now: ${currentApp.name}`
          : "Now";

  const CACHE_FRESH_MS = 60_000;

  useEffect(() => {
    if (!storageReady) return;
    let cancelled = false;
    setIsLoading(true);
    (async () => {
      const cached = await getFocusCache(nowFilePath);
      if (!cancelled && cached && Date.now() - cached.updatedAt < CACHE_FRESH_MS) {
        setFocus({ focus: cached.focus, breadcrumb: cached.breadcrumb });
        setErrorMessage(null);
        setIsLoading(false);
        return;
      }
      const result = await getJsonFocus(nowFilePath);
      if (!cancelled) {
        setFocus(
          result.data
            ? { focus: result.data.focus, breadcrumb: result.data.breadcrumb }
            : null,
        );
        setErrorMessage(result.error ?? null);
        if (result.data) {
          await setFocusCache(
            nowFilePath,
            result.data.focus,
            result.data.breadcrumb,
          );
        }
        setIsLoading(false);
      }
    })();
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
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title={nowInputLabel} />
          <PathActionsMenuSection
            nowFilePath={nowFilePath}
            defaultPath={defaultPath}
            currentDocumentPath={currentDocumentPath}
            docPathForCurrent={docPathForCurrent}
            currentApp={currentApp}
            appPathForCurrent={appPathForCurrent}
            refreshPathFromStorage={refreshPathFromStorage}
            setFocus={setFocus}
            setFocusCache={setFocusCache}
            setNowFilePath={setNowFilePath}
            setSourceLabel={setSourceLabel}
          />
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
                    await setFocusCache(nowFilePath, result.data.focus, result.data.breadcrumb);
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
        </MenuBarExtra.Section>
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Open Focus List"
            icon={Icon.List}
            onAction={() => open(FOCUS_LIST_DEEPLINK)}
          />
          <MenuBarExtra.Item
            title="Open in Editor"
            icon={Icon.Document}
            onAction={() => open(nowFilePath)}
          />
          <MenuBarExtra.Item
            title="Open Extension Preferences…"
            onAction={openExtensionPreferences}
          />
        </MenuBarExtra.Section>
      </MenuBarExtra>
    );
  }

  const rawTitle = `${DATA_STR.focus} ${focus.focus || "—"}`;
  const truncateLen = Math.max(0, parseInt(prefs.menubarTruncateLength ?? "0", 10) || 0);
  const title =
    truncateLen > 0 && rawTitle.length > truncateLen
      ? rawTitle.slice(0, truncateLen) + "…"
      : rawTitle;
  const rawBreadcrumbMax =
    (prefs.breadcrumbMaxLength ?? "64").trim() || "64";
  const parsedBreadcrumbMax = parseInt(rawBreadcrumbMax, 10);
  const breadcrumbMaxLength =
    Number.isNaN(parsedBreadcrumbMax) || parsedBreadcrumbMax <= 0
      ? 0
      : parsedBreadcrumbMax;
  const displayBreadcrumb =
    breadcrumbMaxLength > 0 && focus.breadcrumb
      ? truncateBreadcrumb(focus.breadcrumb, breadcrumbMaxLength)
      : focus.breadcrumb ?? "";
  return (
    <MenuBarExtra
      title={title}
      tooltip={
        isUsingAppFile
          ? `${displayBreadcrumb || title} (${sourceLabel})`
          : displayBreadcrumb || title
      }
    >
      <MenuBarExtra.Section>
        {displayBreadcrumb ? <MenuBarExtra.Item title={displayBreadcrumb} /> : null}
        <MenuBarExtra.Item
          icon={Icon.Checkmark}
          title={focus.focus || "—"}
          onAction={async () => {
            try {
              const result = await runComplete(nowFilePath);
              if (result) {
                setFocus({
                  focus: result.focus.focus,
                  breadcrumb: result.focus.breadcrumb,
                });
                await setFocusCache(
                  nowFilePath,
                  result.focus.focus,
                  result.focus.breadcrumb,
                  result.items,
                );
              } else {
                const focusResult = await getJsonFocus(nowFilePath);
                if (focusResult.data) {
                  setFocus({
                    focus: focusResult.data.focus,
                    breadcrumb: focusResult.data.breadcrumb,
                  });
                  await setFocusCache(
                    nowFilePath,
                    focusResult.data.focus,
                    focusResult.data.breadcrumb,
                  );
                }
              }
              await showToast(Toast.Style.Success, "Completed");
            } catch (e) {
              await showToast(Toast.Style.Failure, "Failed to complete", String(e));
            }
          }}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title={nowInputLabel} />
        <PathActionsMenuSection
          nowFilePath={nowFilePath}
          defaultPath={defaultPath}
          currentDocumentPath={currentDocumentPath}
          docPathForCurrent={docPathForCurrent}
          currentApp={currentApp}
          appPathForCurrent={appPathForCurrent}
          refreshPathFromStorage={refreshPathFromStorage}
          setFocus={setFocus}
          setFocusCache={setFocusCache}
          setNowFilePath={setNowFilePath}
          setSourceLabel={setSourceLabel}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Focus List"
          icon={Icon.List}
          onAction={() => open(FOCUS_LIST_DEEPLINK)}
        />
        <MenuBarExtra.Item
          title="Open in Editor"
          icon={Icon.Document}
          onAction={() => open(nowFilePath)}
        />
        <MenuBarExtra.Item
          title="Open Extension Preferences…"
          onAction={openExtensionPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
