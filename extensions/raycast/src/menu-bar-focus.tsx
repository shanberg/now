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
import chokidar from "chokidar";
import { readFileSync } from "fs";
import { useMemo, useEffect, useRef } from "react";

import { DATA_STR, truncateBreadcrumb } from "now-format";
import { computePathSwitchContext } from "./lib/pathContext";
import {
  PathSwitchActionsMenuBar,
  type PathSwitchCallbacks,
} from "./lib/pathSwitchActions";
import {
  createFocusFile,
  documentDisplayName,
  focusFileExists,
  getOneThingUrl,
  NOW_INSTALL_URL,
  NOW_MENUBAR_PINNED_PATH_KEY,
  openTerminalWithNowStatus,
  resolveNowFilePath,
  runComplete,
  runNowInstallInTerminal,
  runSwitch,
  suggestedNowPathForApp,
  suggestedNowPathForDocument,
} from "./lib/now";
import { createDeeplink, useLocalStorage } from "@raycast/utils";
import { useCliMissing } from "./lib/useCliMissing";
import { useFocusData } from "./lib/useFocusData";
import { useNowPathFromStorage } from "./lib/useNowPath";
import {
  collectPathsToWatch,
  ensureWatcherRunning,
  getWatcherDirtyPath,
} from "./lib/watcherClient";

function focusListDeeplink(nowFilePath: string): string {
  return createDeeplink({
    command: "list-focus",
    context: { path: nowFilePath },
  });
}

interface Preferences {
  focusFilePath: string;
  updateOneThing?: boolean;
  appSpecificNowFiles?: string;
  menubarTruncateLength?: string;
  breadcrumbMaxLength?: string;
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
    appPathsJson,
    docPathsJson,
    refreshPathFromStorage,
    refreshPathFromStorageWithApp,
    setUseGlobal,
    setLastResolvedPath,
    addAppPathMapping,
    addDocumentPathMapping,
  } = useNowPathFromStorage({
    defaultPath,
    appSpecificNowFiles: prefs.appSpecificNowFiles,
  });

  const { value: pinnedPathStorage, setValue: setPinnedPathStorage } =
    useLocalStorage<string>(NOW_MENUBAR_PINNED_PATH_KEY, "");
  const pinnedPath =
    typeof pinnedPathStorage === "string" && pinnedPathStorage.trim() !== ""
      ? pinnedPathStorage.trim()
      : null;
  const effectiveNowPath = pinnedPath ?? nowFilePath;
  const clearMenubarPin = () => void setPinnedPathStorage("");

  // When menubar is opened (click or background), assume display is correct: read only from cache; never fetch.
  const { focus, errorMessage, isLoading, refresh, applyMutationResult } =
    useFocusData(storageReady ? effectiveNowPath : null, null, {
      cacheOnly: true,
    });

  const pathSwitchContext = useMemo(
    () =>
      computePathSwitchContext({
        activePath: effectiveNowPath,
        defaultPath,
        docPathForCurrent,
        appPathForCurrent,
        currentApp,
        currentDocumentPath,
      }),
    [
      effectiveNowPath,
      defaultPath,
      docPathForCurrent,
      appPathForCurrent,
      currentApp,
      currentDocumentPath,
    ],
  );
  const nowInputLabel = pathSwitchContext.contextLabel;

  const pathSwitchCallbacks: PathSwitchCallbacks = useMemo(
    () => ({
      "switch-global": async () => {
        await setUseGlobal(true);
        await refreshPathFromStorage();
        await runSwitch(defaultPath, "0");
        clearMenubarPin();
        await refresh();
      },
      "switch-document": async () => {
        if (!docPathForCurrent) return;
        await setUseGlobal(false);
        await setLastResolvedPath(docPathForCurrent);
        clearMenubarPin();
        setNowFilePath(docPathForCurrent);
        setSourceLabel(
          currentDocumentPath
            ? `Document — ${documentDisplayName(currentDocumentPath)}`
            : "Document",
        );
        await runSwitch(docPathForCurrent, "0");
        await refresh();
      },
      "switch-app": async () => {
        if (!appPathForCurrent) return;
        await setUseGlobal(false);
        await setLastResolvedPath(appPathForCurrent);
        clearMenubarPin();
        setNowFilePath(appPathForCurrent);
        setSourceLabel(
          currentApp ? `${currentApp.name} — ${appPathForCurrent}` : appPathForCurrent,
        );
        await runSwitch(appPathForCurrent, "0");
        await refresh();
      },
      "create-document": async () => {
        if (!currentDocumentPath) return;
        const path = resolveNowFilePath(
          suggestedNowPathForDocument(currentDocumentPath),
        );
        const displayName = documentDisplayName(currentDocumentPath);
        try {
          await createFocusFile(path, displayName);
          await runSwitch(path, "0");
          await addDocumentPathMapping(
            currentDocumentPath,
            suggestedNowPathForDocument(currentDocumentPath),
          );
          await setUseGlobal(false);
          await setLastResolvedPath(path);
          clearMenubarPin();
          setNowFilePath(path);
          setSourceLabel(`Document — ${displayName}`);
          await refreshPathFromStorage();
          await showToast(
            Toast.Style.Success,
            "Created and using for current document",
          );
        } catch (e) {
          await showToast(
            Toast.Style.Failure,
            "Failed to create file",
            String(e),
          );
        }
      },
      "create-app": async () => {
        if (!currentApp) return;
        const path = resolveNowFilePath(suggestedNowPathForApp(currentApp));
        try {
          await createFocusFile(path, currentApp.name);
          await runSwitch(path, "0");
          const key = currentApp.bundleId ?? currentApp.name;
          await addAppPathMapping(key, suggestedNowPathForApp(currentApp));
          await setUseGlobal(false);
          await setLastResolvedPath(path);
          clearMenubarPin();
          setNowFilePath(path);
          setSourceLabel(currentApp.name);
          await refreshPathFromStorage();
          await showToast(
            Toast.Style.Success,
            `Created and using for ${currentApp.name}`,
          );
        } catch (e) {
          await showToast(
            Toast.Style.Failure,
            "Failed to create file",
            String(e),
          );
        }
      },
    }),
    [
      setUseGlobal,
      refreshPathFromStorage,
      setLastResolvedPath,
      addDocumentPathMapping,
      addAppPathMapping,
      defaultPath,
      docPathForCurrent,
      appPathForCurrent,
      currentApp,
      currentDocumentPath,
      clearMenubarPin,
      setNowFilePath,
      setSourceLabel,
      refresh,
    ],
  );

  const cliMissing = useCliMissing(focus === null && !isLoading);

  const isUsingAppFile = nowFilePath !== defaultPath;

  useEffect(() => {
    if (prefs.updateOneThing && focus?.focus) {
      open(getOneThingUrl(focus.focus));
    }
  }, [prefs.updateOneThing, focus?.focus]);

  useEffect(() => {
    if (!storageReady || !defaultPath) return;
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
    storageReady,
    defaultPath,
    appPathsJson,
    docPathsJson,
    prefs.appSpecificNowFiles,
    environment.supportPath,
    environment.assetsPath,
  ]);

  // On mount (e.g. when launched via deeplink after app switch), resolve path from dirty file app if recent.
  const mountReadDoneRef = useRef(false);
  useEffect(() => {
    if (!storageReady || mountReadDoneRef.current) return;
    mountReadDoneRef.current = true;
    const dirtyPath = getWatcherDirtyPath(environment.supportPath);
    try {
      const raw = readFileSync(dirtyPath, "utf-8");
      const parsed = JSON.parse(raw) as
        | { ts?: number; app?: { bundleId?: string; name?: string } }
        | number
        | null;
      const obj = parsed != null && typeof parsed === "object" ? parsed : null;
      const ageMs = obj?.ts != null ? Date.now() - obj.ts : Infinity;
      if (ageMs < 60_000 && obj?.app?.name) {
        void refreshPathFromStorageWithApp({
          bundleId: obj.app.bundleId,
          name: obj.app.name,
        });
      }
    } catch {
      // ignore
    }
  }, [storageReady, refreshPathFromStorageWithApp]);

  // When the Swift watcher writes to the dirty file, refresh. Use chokidar (fsevents on macOS) so writes from another process are detected; Node fs.watch often misses them.
  useEffect(() => {
    if (!storageReady) return;
    const dirtyPath = getWatcherDirtyPath(environment.supportPath);
    const watcher = chokidar.watch(dirtyPath, { persistent: true });
    const onChange = () => {
      let appOverride: { bundleId?: string; name: string } | null = null;
      try {
        const raw = readFileSync(dirtyPath, "utf-8");
        const parsed = JSON.parse(raw) as
          | { ts?: number; app?: { bundleId?: string; name?: string } }
          | number
          | null;
        const obj = parsed != null && typeof parsed === "object" ? parsed : null;
        if (obj?.app?.name) {
          appOverride = {
            bundleId: obj.app.bundleId,
            name: obj.app.name,
          };
        }
      } catch {
        // not JSON or missing: resolve from frontmost app
      }
      if (appOverride) {
        void refreshPathFromStorageWithApp(appOverride).then(() => refresh());
      } else {
        void refreshPathFromStorage().then(() => refresh());
      }
    };
    watcher.on("change", onChange);
    return () => {
      watcher.close();
    };
  }, [
    storageReady,
    environment.supportPath,
    refresh,
    refreshPathFromStorage,
    refreshPathFromStorageWithApp,
  ]);

  if (!storageReady || isLoading) {
    return (
      <MenuBarExtra isLoading tooltip="Now focus">
        <MenuBarExtra.Item title="Loading…" />
      </MenuBarExtra>
    );
  }

  if (!focus) {
    const fileMissing = !focusFileExists(effectiveNowPath);
    return (
      <MenuBarExtra
        tooltip={
          fileMissing
            ? "No focus file at path"
            : cliMissing
              ? "now CLI not installed"
              : (errorMessage ?? "Could not read focus file")
        }
      >
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title={nowInputLabel} />
          {pinnedPath ? (
            <MenuBarExtra.Item
              title="Unpin focus"
              icon={Icon.PinDisabled}
              onAction={() => clearMenubarPin()}
            />
          ) : (
            <MenuBarExtra.Item
              title="Pin focus on current file"
              icon={Icon.Pin}
              onAction={() => setPinnedPathStorage(effectiveNowPath)}
            />
          )}
          <PathSwitchActionsMenuBar
            context={pathSwitchContext}
            callbacks={pathSwitchCallbacks}
          />
          <MenuBarExtra.Item title="No focus" />
          {fileMissing ? (
            <MenuBarExtra.Item
              title="Create Focus File"
              onAction={async () => {
                try {
                  await createFocusFile(effectiveNowPath);
                  await runSwitch(effectiveNowPath, "0");
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
                  await openTerminalWithNowStatus(effectiveNowPath);
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
            onAction={() => open(focusListDeeplink(effectiveNowPath))}
          />
          <MenuBarExtra.Item
            title="Open in Editor"
            icon={Icon.Document}
            onAction={() => open(effectiveNowPath)}
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
  const truncateLen = Math.max(
    0,
    parseInt(prefs.menubarTruncateLength ?? "0", 10) || 0,
  );
  const title =
    truncateLen > 0 && rawTitle.length > truncateLen
      ? rawTitle.slice(0, truncateLen) + "…"
      : rawTitle;
  const titleWithPin = pinnedPath ? `${title} 📌` : title;
  const rawBreadcrumbMax = (prefs.breadcrumbMaxLength ?? "64").trim() || "64";
  const parsedBreadcrumbMax = parseInt(rawBreadcrumbMax, 10);
  const breadcrumbMaxLength =
    Number.isNaN(parsedBreadcrumbMax) || parsedBreadcrumbMax <= 0
      ? 0
      : parsedBreadcrumbMax;
  const displayBreadcrumb =
    breadcrumbMaxLength > 0 && focus.breadcrumb
      ? truncateBreadcrumb(focus.breadcrumb, breadcrumbMaxLength)
      : (focus.breadcrumb ?? "");
  return (
    <MenuBarExtra
      title={titleWithPin}
      tooltip={
        isUsingAppFile
          ? `${displayBreadcrumb || title} (${sourceLabel})`
          : displayBreadcrumb || title
      }
    >
      <MenuBarExtra.Section>
        {displayBreadcrumb ? (
          <MenuBarExtra.Item title={displayBreadcrumb} />
        ) : null}
        <MenuBarExtra.Item
          icon={Icon.Checkmark}
          title={focus.focus || "—"}
          onAction={async () => {
            try {
              const result = await runComplete(effectiveNowPath);
              if (result) {
                await applyMutationResult(result);
              } else {
                await refresh();
              }
              await showToast(Toast.Style.Success, "Completed");
            } catch (e) {
              await showToast(
                Toast.Style.Failure,
                "Failed to complete",
                String(e),
              );
            }
          }}
          alternate={
            <MenuBarExtra.Item
              title="Open Focus List"
              icon={Icon.List}
              onAction={() => open(focusListDeeplink(effectiveNowPath))}
            />
          }
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title={nowInputLabel} />
        {pinnedPath ? (
          <MenuBarExtra.Item
            title="Unpin focus"
            icon={Icon.PinDisabled}
            onAction={() => clearMenubarPin()}
          />
        ) : (
          <MenuBarExtra.Item
            title="Pin focus on current file"
            icon={Icon.Pin}
            onAction={() => setPinnedPathStorage(effectiveNowPath)}
          />
        )}
        <PathSwitchActionsMenuBar
          context={pathSwitchContext}
          callbacks={pathSwitchCallbacks}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Submenu title="More" icon={Icon.Gear}>
        <MenuBarExtra.Item
          title="Open Focus List"
          icon={Icon.List}
          onAction={() => open(focusListDeeplink(effectiveNowPath))}
        />
        <MenuBarExtra.Item
          title="Open in Editor"
          icon={Icon.Document}
          onAction={() => open(effectiveNowPath)}
        />
        <MenuBarExtra.Item
          title="Open Extension Preferences…"
          onAction={openExtensionPreferences}
        />
      </MenuBarExtra.Submenu>
    </MenuBarExtra>
  );
}
