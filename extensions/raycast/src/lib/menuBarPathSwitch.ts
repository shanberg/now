/**
 * Path-switch and create callbacks for menu-bar-focus.
 * Shared flows: switch global/app, create for app, with pin clear and refresh.
 */
import { showToast, Toast } from "@raycast/api";
import {
  createFocusFile,
  resolveNowFilePath,
  runSwitch,
  suggestedNowPathForApp,
} from "./now";
import type { PathSwitchCallbacks } from "./pathSwitchActions";

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
  await deps.setUseGlobal(true);
  await deps.refreshPathFromStorage();
  await runSwitch(deps.defaultPath, "0");
  deps.clearMenubarPin();
  await deps.refresh();
}

/** Shared "switch to path" flow: set storage, clear pin, set path/label, runSwitch, refresh. */
async function applySwitchToPath(
  path: string,
  label: string,
  d: MenubarPathSwitchDeps,
): Promise<void> {
  await d.setUseGlobal(false);
  await d.setLastResolvedPath(path);
  d.clearMenubarPin();
  d.setNowFilePath(path);
  d.setSourceLabel(label);
  await runSwitch(path, "0");
  await d.refresh();
}

/** Shared "commit path" after create: set storage, clear pin, set path/label, refreshPathFromStorage. */
async function commitSwitchedPath(
  path: string,
  label: string,
  d: MenubarPathSwitchDeps,
): Promise<void> {
  await d.setUseGlobal(false);
  await d.setLastResolvedPath(path);
  d.clearMenubarPin();
  d.setNowFilePath(path);
  d.setSourceLabel(label);
  await d.refreshPathFromStorage();
}

async function menubarSwitchApp(deps: MenubarPathSwitchDeps): Promise<void> {
  if (!deps.appPathForCurrent) return;
  const label = deps.currentApp
    ? `${deps.currentApp.name} — ${deps.appPathForCurrent}`
    : deps.appPathForCurrent;
  await applySwitchToPath(deps.appPathForCurrent, label, deps);
}

async function menubarCreateApp(deps: MenubarPathSwitchDeps): Promise<void> {
  if (!deps.currentApp) return;
  const path = resolveNowFilePath(suggestedNowPathForApp(deps.currentApp));
  try {
    await createFocusFile(path, deps.currentApp.name);
    await runSwitch(path, "0");
    await deps.addAppPathMapping(
      deps.currentApp.bundleId ?? deps.currentApp.name,
      suggestedNowPathForApp(deps.currentApp),
    );
    await commitSwitchedPath(path, deps.currentApp.name, deps);
    await showToast(
      Toast.Style.Success,
      `Created and using for ${deps.currentApp.name}`,
    );
  } catch (e) {
    await showToast(
      Toast.Style.Failure,
      "Failed to create file",
      String(e),
    );
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
