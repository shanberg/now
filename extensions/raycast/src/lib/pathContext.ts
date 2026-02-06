/**
 * Pure path-switch context: which path actions are visible and their labels (global + app only).
 * Single source of truth for list-focus and menu-bar-focus.
 */
import { resolveNowFilePath, suggestedNowPathForApp } from "./now";

export type PathSwitchContextInput = {
  activePath: string | null;
  defaultPath: string;
  appPathForCurrent: string | null;
  currentApp: { name: string; bundleId?: string } | null;
};

export type PathSwitchContext = {
  switchToGlobal: { visible: true; path: string } | { visible: false };
  switchToApp:
    | { visible: true; path: string; label: string }
    | { visible: false };
  createForApp:
    | { visible: true; suggestedPath: string; displayName: string }
    | { visible: false };
  contextLabel: string;
};

function computeSwitchToGlobal(
  input: PathSwitchContextInput,
): PathSwitchContext["switchToGlobal"] {
  const { activePath, defaultPath } = input;
  return activePath != null && activePath !== defaultPath
    ? { visible: true, path: defaultPath }
    : { visible: false };
}

function computeSwitchToApp(
  input: PathSwitchContextInput,
): PathSwitchContext["switchToApp"] {
  const { activePath, appPathForCurrent, currentApp } = input;
  const visible =
    appPathForCurrent != null &&
    currentApp != null &&
    activePath != null &&
    activePath !== appPathForCurrent;
  return visible
    ? {
        visible: true,
        path: appPathForCurrent,
        label: currentApp.name,
      }
    : { visible: false };
}

function computeCreateForApp(
  input: PathSwitchContextInput,
): PathSwitchContext["createForApp"] {
  const { currentApp, appPathForCurrent } = input;
  const visible = currentApp != null && !appPathForCurrent;
  return visible
    ? {
        visible: true,
        suggestedPath: resolveNowFilePath(suggestedNowPathForApp(currentApp)),
        displayName: currentApp.name,
      }
    : { visible: false };
}

function isAppContext(input: PathSwitchContextInput): boolean {
  const { activePath, appPathForCurrent, currentApp } = input;
  return !!(
    appPathForCurrent &&
    activePath === appPathForCurrent &&
    currentApp
  );
}

function computeContextLabel(input: PathSwitchContextInput): string {
  const { activePath, defaultPath, currentApp } = input;
  if (activePath === defaultPath) return "Now";
  if (isAppContext(input)) return `Now: ${currentApp!.name}`;
  return "Now";
}

/**
 * Computes which path switch/create actions are visible and the section label.
 * Matches the logic previously in list-focus and menu-bar-focus (effectivePath/defaultPath/appPathForCurrent).
 */
export function computePathSwitchContext(
  input: PathSwitchContextInput,
): PathSwitchContext {
  return {
    switchToGlobal: computeSwitchToGlobal(input),
    switchToApp: computeSwitchToApp(input),
    createForApp: computeCreateForApp(input),
    contextLabel: computeContextLabel(input),
  };
}

export type PathActionDescriptor =
  | { id: "switch-global"; title: string; path: string }
  | { id: "switch-app"; title: string; path: string }
  | {
      id: "create-app";
      title: string;
      suggestedPath: string;
      displayName: string;
    };

/** Returns paths that are valid switch targets (for prefetching previews). */
export function pathSwitchContextSwitchTargetPaths(
  ctx: PathSwitchContext,
): string[] {
  const paths: string[] = [];
  if (ctx.switchToGlobal.visible) paths.push(ctx.switchToGlobal.path);
  if (ctx.switchToApp.visible) paths.push(ctx.switchToApp.path);
  return paths;
}

/** Order: create app, switch global, switch app (matches current UI). */
export function pathSwitchContextToDescriptors(
  ctx: PathSwitchContext,
): PathActionDescriptor[] {
  const out: PathActionDescriptor[] = [];
  if (ctx.createForApp.visible) {
    out.push({
      id: "create-app",
      title: `Create Now File for ${ctx.createForApp.displayName}`,
      suggestedPath: ctx.createForApp.suggestedPath,
      displayName: ctx.createForApp.displayName,
    });
  }
  if (ctx.switchToGlobal.visible) {
    out.push({
      id: "switch-global",
      title: "Switch to Global",
      path: ctx.switchToGlobal.path,
    });
  }
  if (ctx.switchToApp.visible) {
    out.push({
      id: "switch-app",
      title: `Switch to ${ctx.switchToApp.label} file`,
      path: ctx.switchToApp.path,
    });
  }
  return out;
}
