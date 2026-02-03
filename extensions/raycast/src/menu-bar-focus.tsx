import {
  environment,
  getPreferenceValues,
  Icon,
  LaunchType,
  MenuBarExtra,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect } from "react";

import { DATA_STR, truncateBreadcrumb } from "now-format";
import {
  createFocusFile,
  focusFileExists,
  documentDisplayName,
  getOneThingUrl,
  NOW_INSTALL_URL,
  openTerminalWithNowStatus,
  resolveNowFilePath,
  runComplete,
  runNowInstallInTerminal,
  suggestedNowPathForApp,
  suggestedNowPathForDocument,
} from "./lib/now";
import { createDeeplink } from "@raycast/utils";
import { useCliMissing } from "./lib/useCliMissing";
import { useFocusData } from "./lib/useFocusData";
import { useNowPathFromStorage } from "./lib/useNowPath";

function focusListDeeplink(nowFilePath: string): string {
  return createDeeplink({ command: "list-focus", context: { path: nowFilePath } });
}

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
  setUseGlobal: (useGlobal: boolean) => Promise<void>;
  setLastResolvedPath: (path: string) => Promise<void>;
  addAppPathMapping: (key: string, nowPath: string) => Promise<void>;
  addDocumentPathMapping: (documentPath: string, nowPath: string) => Promise<void>;
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
  setUseGlobal,
  setLastResolvedPath,
  addAppPathMapping,
  addDocumentPathMapping,
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
              await setLastResolvedPath(path);
              setNowFilePath(path);
              setSourceLabel(`Document — ${documentDisplayName(currentDocumentPath)}`);
              await refreshPathFromStorage();
              await showToast(Toast.Style.Success, "Created and using for current document");
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
              await setLastResolvedPath(path);
              setNowFilePath(path);
              setSourceLabel(`${currentApp.name}`);
              await refreshPathFromStorage();
              await showToast(Toast.Style.Success, `Created and using for ${currentApp.name}`);
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
          }}
        />
      ) : null}
    </>
  );
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const defaultPath = resolveNowFilePath(prefs.focusFilePath);

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
    errorMessage,
    isLoading,
    refresh,
    applyMutationResult,
  } = useFocusData(
    storageReady ? nowFilePath : null,
    null,
    {
      cacheOnly: environment.launchType === LaunchType.Background,
      maxCacheAgeMs: 60_000,
    },
  );

  const cliMissing = useCliMissing(focus === null && !isLoading);

  const isUsingAppFile = nowFilePath !== defaultPath;

  const nowInputLabel =
    nowFilePath === defaultPath
      ? "Now"
      : docPathForCurrent && nowFilePath === docPathForCurrent && currentDocumentPath
        ? `Now: ${documentDisplayName(currentDocumentPath)}`
        : appPathForCurrent && nowFilePath === appPathForCurrent && currentApp
          ? `Now: ${currentApp.name}`
          : "Now";

  useEffect(() => {
    if (prefs.updateOneThing && focus?.focus) {
      open(getOneThingUrl(focus.focus));
    }
  }, [prefs.updateOneThing, focus?.focus]);

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
            setUseGlobal={setUseGlobal}
            setLastResolvedPath={setLastResolvedPath}
            addAppPathMapping={addAppPathMapping}
            addDocumentPathMapping={addDocumentPathMapping}
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
                  await new Promise((r) => setTimeout(r, 100));
                  await refresh();
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
        <MenuBarExtra.Submenu title="More" icon={Icon.Gear}>
          <MenuBarExtra.Item
            title="Open Focus List"
            icon={Icon.List}
            onAction={() => open(focusListDeeplink(nowFilePath))}
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
        </MenuBarExtra.Submenu>
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
                await applyMutationResult(result);
              } else {
                await refresh();
              }
              await showToast(Toast.Style.Success, "Completed");
            } catch (e) {
              await showToast(Toast.Style.Failure, "Failed to complete", String(e));
            }
          }}
          alternate={
            <MenuBarExtra.Item
              title="Open Focus List"
              icon={Icon.List}
              onAction={() => open(focusListDeeplink(nowFilePath))}
            />
          }
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
          setUseGlobal={setUseGlobal}
          setLastResolvedPath={setLastResolvedPath}
          addAppPathMapping={addAppPathMapping}
          addDocumentPathMapping={addDocumentPathMapping}
          setNowFilePath={setNowFilePath}
          setSourceLabel={setSourceLabel}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Submenu title="More" icon={Icon.Gear}>
        <MenuBarExtra.Item
          title="Open Focus List"
          icon={Icon.List}
          onAction={() => open(focusListDeeplink(nowFilePath))}
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
      </MenuBarExtra.Submenu>
    </MenuBarExtra>
  );
}
