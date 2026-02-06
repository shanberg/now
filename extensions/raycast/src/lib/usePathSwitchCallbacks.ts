/**
 * Builds path-switch callbacks for list-focus: switch to global/app and create for app.
 * Centralizes the "set path, runSwitch, apply/refresh, setSelectedId" flow.
 */
import { useCallback } from "react";
import { showToast, Toast } from "@raycast/api";
import {
  createFocusFile,
  resolveNowFilePath,
  suggestedNowPathForApp,
  type MutationResult,
} from "./now";
import { DEFAULT_SELECTED_ACTION_ID } from "./listFocusHelpers";
import type { PathSwitchCallbacks } from "./pathSwitchActions";
import { performSwitchToPath } from "./pathSwitchShared";

export type UsePathSwitchCallbacksArgs = {
  defaultPath: string;
  appPathForCurrent: string | null;
  currentApp: { name: string; bundleId?: string } | null;
  setUseGlobal: (use: boolean) => Promise<void>;
  setLastResolvedPath: (path: string) => Promise<void>;
  refreshPathFromStorage: () => Promise<void>;
  setPinnedPath: (path: string | null) => void;
  addAppPathMapping: (key: string, path: string) => Promise<void>;
  applyMutationResult: (result: MutationResult) => Promise<void>;
  refresh: () => void | Promise<void>;
  setSelectedId: (id: string | null) => void;
};

export function usePathSwitchCallbacks({
  defaultPath,
  appPathForCurrent,
  currentApp,
  setUseGlobal,
  setLastResolvedPath,
  refreshPathFromStorage,
  setPinnedPath,
  addAppPathMapping,
  applyMutationResult,
  refresh,
  setSelectedId,
}: UsePathSwitchCallbacksArgs): PathSwitchCallbacks {
  const switchToGlobal = useCallback(async () => {
    await performSwitchToPath({
      path: defaultPath,
      setUseGlobal,
      useGlobal: true,
      setLastResolvedPath,
      refreshPathFromStorage,
      beforeRunSwitch: () => setPinnedPath(defaultPath),
      applyMutationResult,
      refresh,
      afterSwitched: () => setSelectedId(DEFAULT_SELECTED_ACTION_ID),
    });
  }, [
    defaultPath,
    setUseGlobal,
    setLastResolvedPath,
    refreshPathFromStorage,
    setPinnedPath,
    applyMutationResult,
    refresh,
    setSelectedId,
  ]);

  const switchToApp = useCallback(async () => {
    const path = appPathForCurrent ?? "";
    await performSwitchToPath({
      path,
      setUseGlobal,
      useGlobal: false,
      setLastResolvedPath,
      refreshPathFromStorage,
      beforeRunSwitch: () => setPinnedPath(appPathForCurrent ?? null),
      applyMutationResult,
      refresh,
      afterSwitched: () => setSelectedId(DEFAULT_SELECTED_ACTION_ID),
    });
  }, [
    appPathForCurrent,
    setUseGlobal,
    setLastResolvedPath,
    refreshPathFromStorage,
    setPinnedPath,
    applyMutationResult,
    refresh,
    setSelectedId,
  ]);

  const createForApp = useCallback(async () => {
    if (!currentApp) return;
    const path = resolveNowFilePath(suggestedNowPathForApp(currentApp));
    try {
      await createFocusFile(path, currentApp.name);
      const key = currentApp.bundleId ?? currentApp.name;
      await addAppPathMapping(key, suggestedNowPathForApp(currentApp));
      await showToast(
        Toast.Style.Success,
        `Created and using for ${currentApp.name}`,
      );
      await performSwitchToPath({
        path,
        setUseGlobal,
        useGlobal: false,
        setLastResolvedPath,
        refreshPathFromStorage,
        beforeRunSwitch: () => setPinnedPath(path),
        applyMutationResult,
        refresh,
        afterSwitched: () => setSelectedId(DEFAULT_SELECTED_ACTION_ID),
      });
    } catch (e) {
      await showToast(Toast.Style.Failure, "Failed to create file", String(e));
    }
  }, [
    currentApp,
    addAppPathMapping,
    setUseGlobal,
    setLastResolvedPath,
    refreshPathFromStorage,
    setPinnedPath,
    refresh,
    applyMutationResult,
    setSelectedId,
  ]);

  return {
    "switch-global": switchToGlobal,
    "switch-app": switchToApp,
    "create-app": createForApp,
  };
}
