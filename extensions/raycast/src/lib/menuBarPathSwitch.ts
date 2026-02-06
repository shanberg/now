/**
 * Path-switch and create callbacks for menu-bar-focus.
 * Shared flows: switch global/app, create for app, with pin clear and refresh.
 */
import { showToast, Toast } from "@raycast/api";
import {
  createFocusFile,
  resolveNowFilePath,
  suggestedNowPathForApp,
} from "./now";
import type { PathSwitchCallbacks } from "./pathSwitchActions";
import { performSwitchToPath } from "./pathSwitchShared";

export type MenubarPathSwitchDeps = {
  setUseGlobal: (useGlobal: boolean) => Promise<void>;
  refreshPathFromStorage: () => Promise<void>;
  setLastResolvedPath: (path: string) => Promise<void>;
  addAppPathMapping: (key: string, nowPath: string) => Promise<void>;
  defaultPath: string;
  appPathForCurrent: string | null;
  currentApp: { name: string; bundleId?: string } | null;
  clearMenubarPin: () => void;
  setNowFilePath: (path: string) => void;
  setSourceLabel: (label: string) => void;
  refresh: () => void | Promise<void>;
};

async function menubarSwitchGlobal(deps: MenubarPathSwitchDeps): Promise<void> {
  await performSwitchToPath({
    path: deps.defaultPath,
    setUseGlobal: deps.setUseGlobal,
    useGlobal: true,
    refreshPathFromStorage: deps.refreshPathFromStorage,
    beforeRunSwitch: deps.clearMenubarPin,
    refresh: deps.refresh,
  });
}

async function menubarSwitchApp(deps: MenubarPathSwitchDeps): Promise<void> {
  if (!deps.appPathForCurrent) return;
  const label = deps.currentApp
    ? `${deps.currentApp.name} — ${deps.appPathForCurrent}`
    : deps.appPathForCurrent;
  await performSwitchToPath({
    path: deps.appPathForCurrent,
    setUseGlobal: deps.setUseGlobal,
    useGlobal: false,
    setLastResolvedPath: deps.setLastResolvedPath,
    beforeRunSwitch: () => {
      deps.clearMenubarPin();
      deps.setNowFilePath(deps.appPathForCurrent!);
      deps.setSourceLabel(label);
    },
    refresh: deps.refresh,
  });
}

async function menubarCreateApp(deps: MenubarPathSwitchDeps): Promise<void> {
  if (!deps.currentApp) return;
  const path = resolveNowFilePath(suggestedNowPathForApp(deps.currentApp));
  try {
    await createFocusFile(path, deps.currentApp.name);
    await deps.addAppPathMapping(
      deps.currentApp.bundleId ?? deps.currentApp.name,
      suggestedNowPathForApp(deps.currentApp),
    );
    await performSwitchToPath({
      path,
      setUseGlobal: deps.setUseGlobal,
      useGlobal: false,
      setLastResolvedPath: deps.setLastResolvedPath,
      refreshPathFromStorage: deps.refreshPathFromStorage,
      beforeRunSwitch: () => {
        deps.clearMenubarPin();
        deps.setNowFilePath(path);
        deps.setSourceLabel(deps.currentApp!.name);
      },
      refresh: deps.refresh,
    });
    await showToast(
      Toast.Style.Success,
      `Created and using for ${deps.currentApp.name}`,
    );
  } catch (e) {
    await showToast(Toast.Style.Failure, "Failed to create file", String(e));
  }
}

/** Build path-switch callbacks for the menubar so the Command body stays small. */
export function createMenubarPathSwitchCallbacks(
  deps: MenubarPathSwitchDeps,
): PathSwitchCallbacks {
  return {
    "switch-global": () => menubarSwitchGlobal(deps),
    "switch-app": () => menubarSwitchApp(deps),
    "create-app": () => menubarCreateApp(deps),
  };
}
