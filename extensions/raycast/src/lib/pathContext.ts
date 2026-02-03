/**
 * Pure path-switch context: which of the five path actions are visible and their labels.
 * Single source of truth for list-focus and menu-bar-focus so they don't re-derive the same conditions.
 */
import {
  documentDisplayName,
  resolveNowFilePath,
  suggestedNowPathForApp,
  suggestedNowPathForDocument,
} from "./now";

export type PathSwitchContextInput = {
  activePath: string | null;
  defaultPath: string;
  docPathForCurrent: string | null;
  appPathForCurrent: string | null;
  currentApp: { name: string; bundleId?: string } | null;
  currentDocumentPath: string | null;
};

export type PathSwitchContext = {
  switchToGlobal: { visible: true; path: string } | { visible: false };
  switchToDocument: { visible: true; path: string; label: string } | { visible: false };
  switchToApp: { visible: true; path: string; label: string } | { visible: false };
  createForDocument:
  | { visible: true; suggestedPath: string; displayName: string }
  | { visible: false };
  createForApp:
  | { visible: true; suggestedPath: string; displayName: string }
  | { visible: false };
  contextLabel: string;
};

/**
 * Computes which path switch/create actions are visible and the section label.
 * Matches the logic previously in list-focus and menu-bar-focus (effectivePath/defaultPath/docPathForCurrent/appPathForCurrent).
 */
export function computePathSwitchContext(
  input: PathSwitchContextInput,
): PathSwitchContext {
  const {
    activePath,
    defaultPath,
    docPathForCurrent,
    appPathForCurrent,
    currentApp,
    currentDocumentPath,
  } = input;

  const switchToGlobal: PathSwitchContext["switchToGlobal"] =
    activePath != null && activePath !== defaultPath
      ? { visible: true, path: defaultPath }
      : { visible: false };

  const switchToDocument: PathSwitchContext["switchToDocument"] =
    docPathForCurrent != null &&
      activePath != null &&
      activePath !== docPathForCurrent
      ? {
        visible: true,
        path: docPathForCurrent,
        label: documentDisplayName(currentDocumentPath ?? ""),
      }
      : { visible: false };

  const switchToApp: PathSwitchContext["switchToApp"] =
    appPathForCurrent != null &&
      currentApp != null &&
      activePath != null &&
      activePath !== appPathForCurrent
      ? {
        visible: true,
        path: appPathForCurrent,
        label: currentApp.name,
      }
      : { visible: false };

  const createForDocument: PathSwitchContext["createForDocument"] =
    currentDocumentPath != null && !docPathForCurrent
      ? {
        visible: true,
        suggestedPath: resolveNowFilePath(
          suggestedNowPathForDocument(currentDocumentPath),
        ),
        displayName: documentDisplayName(currentDocumentPath),
      }
      : { visible: false };

  const createForApp: PathSwitchContext["createForApp"] =
    currentApp != null && !appPathForCurrent
      ? {
        visible: true,
        suggestedPath: resolveNowFilePath(
          suggestedNowPathForApp(currentApp),
        ),
        displayName: currentApp.name,
      }
      : { visible: false };

  const contextLabel =
    activePath === defaultPath
      ? "Now"
      : docPathForCurrent &&
        activePath === docPathForCurrent &&
        currentDocumentPath
        ? `Now: ${documentDisplayName(currentDocumentPath)}`
        : appPathForCurrent &&
          activePath === appPathForCurrent &&
          currentApp
          ? `Now: ${currentApp.name}`
          : "Now";

  return {
    switchToGlobal,
    switchToDocument,
    switchToApp,
    createForDocument,
    createForApp,
    contextLabel,
  };
}

export type PathActionDescriptor =
  | { id: "switch-global"; title: string; path: string }
  | { id: "switch-document"; title: string; path: string }
  | { id: "switch-app"; title: string; path: string }
  | {
    id: "create-document";
    title: string;
    suggestedPath: string;
    displayName: string;
  }
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
  if (ctx.switchToDocument.visible) paths.push(ctx.switchToDocument.path);
  if (ctx.switchToApp.visible) paths.push(ctx.switchToApp.path);
  return paths;
}

/** Order: create doc, create app, switch global, switch document, switch app (matches current UI). */
export function pathSwitchContextToDescriptors(
  ctx: PathSwitchContext,
): PathActionDescriptor[] {
  const out: PathActionDescriptor[] = [];
  if (ctx.createForDocument.visible) {
    out.push({
      id: "create-document",
      title: `Create Now File for ${ctx.createForDocument.displayName}`,
      suggestedPath: ctx.createForDocument.suggestedPath,
      displayName: ctx.createForDocument.displayName,
    });
  }
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
  if (ctx.switchToDocument.visible) {
    out.push({
      id: "switch-document",
      title: "Switch to Document File",
      path: ctx.switchToDocument.path,
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
