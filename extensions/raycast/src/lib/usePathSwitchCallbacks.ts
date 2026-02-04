/**
 * Builds path-switch callbacks for list-focus: switch to global/app and create for app.
 * Centralizes the "set path, runSwitch, apply/refresh, setSelectedId" flow.
 */
import { useCallback } from "react";
import { showToast, Toast } from "@raycast/api";
import {
  createFocusFile,
  resolveNowFilePath,
  runSwitch,
  suggestedNowPathForApp,
  type MutationResult,
} from "./now";
import { DEFAULT_SELECTED_ACTION_ID } from "./listFocusHelpers";
import type { PathSwitchCallbacks } from "./pathSwitchActions";

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

/** Shared sequence: set storage, pin path, runSwitch, apply/refresh, set selection. */
async function switchToPath(
  path: string,
  opts: {
    setUseGlobal: (use: boolean) => Promise<void>;
    setLastResolvedPath: (path: string) => Promise<void>;
    refreshPathFromStorage: () => Promise<void>;
    setPinnedPath: (path: string | null) => void;
    applyMutationResult: (result: MutationResult) => Promise<void>;
    refresh: () => void | Promise<void>;
    setSelectedId: (id: string | null) => void;
    useGlobal: boolean;
    pinnedPath: string | null;
  },
): Promise<void> {
  await opts.setUseGlobal(opts.useGlobal);
  await opts.setLastResolvedPath(path);
  await opts.refreshPathFromStorage();
  opts.setPinnedPath(opts.pinnedPath);
  const result = await runSwitch(path, "0");
  if (result) await opts.applyMutationResult(result);
  else await opts.refresh();
  opts.setSelectedId(DEFAULT_SELECTED_ACTION_ID);
}

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
    await switchToPath(defaultPath, {
      setUseGlobal,
      setLastResolvedPath,
      refreshPathFromStorage,
      setPinnedPath,
      applyMutationResult,
      refresh,
      setSelectedId,
      useGlobal: true,
      pinnedPath: defaultPath,
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
    await switchToPath(path, {
      setUseGlobal,
      setLastResolvedPath,
      refreshPathFromStorage,
      setPinnedPath,
      applyMutationResult,
      refresh,
      setSelectedId,
      useGlobal: false,
      pinnedPath: appPathForCurrent ?? null,
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
      setSelectedId(DEFAULT_SELECTED_ACTION_ID);
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

  return {
    "switch-global": switchToGlobal,
    "switch-app": switchToApp,
    "create-app": createForApp,
  };
}
