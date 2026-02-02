import { getFrontmostApplication, LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  getCurrentDocumentPath,
  mergeAppPathsJson,
  NOW_APP_PATHS_KEY,
  NOW_DOCUMENT_PATHS_KEY,
  NOW_LAST_RESOLVED_PATH_KEY,
  NOW_USE_GLOBAL_KEY,
  resolveNowPathFromContext,
} from "./now";

export type UseNowPathOptions = {
  defaultPath: string;
  appSpecificNowFiles?: string;
};

export type UseNowPathResult = {
  nowFilePath: string;
  setNowFilePath: (path: string) => void;
  sourceLabel: string;
  setSourceLabel: (label: string) => void;
  currentApp: { name: string; bundleId?: string } | null;
  currentDocumentPath: string | null;
  appPathForCurrent: string | null;
  docPathForCurrent: string | null;
  pathReady: boolean;
  refreshPathFromStorage: () => Promise<void>;
};

/**
 * Single source of truth for "which Now file is active." Reads LocalStorage and
 * frontmost app/document, runs resolveNowPathFromContext, and exposes state
 * and refresh. Both list-focus and menu-bar-focus use this so they never drift.
 */
export function useNowPathFromStorage(
  options: UseNowPathOptions,
): UseNowPathResult {
  const { defaultPath, appSpecificNowFiles } = options;
  const [nowFilePath, setNowFilePath] = useState<string>(defaultPath);
  const [sourceLabel, setSourceLabel] = useState<string>("Global");
  const [currentApp, setCurrentApp] = useState<{
    name: string;
    bundleId?: string;
  } | null>(null);
  const [appPathForCurrent, setAppPathForCurrent] = useState<string | null>(
    null,
  );
  const [currentDocumentPath, setCurrentDocumentPath] = useState<string | null>(
    null,
  );
  const [docPathForCurrent, setDocPathForCurrent] = useState<string | null>(
    null,
  );
  const [pathReady, setPathReady] = useState(false);

  const refreshPathFromStorage = useCallback(async () => {
    const useGlobal =
      (await LocalStorage.getItem<string>(NOW_USE_GLOBAL_KEY)) === "true";
    const docPathsJson =
      (await LocalStorage.getItem<string>(NOW_DOCUMENT_PATHS_KEY)) ?? "{}";
    const localPathsJson =
      (await LocalStorage.getItem<string>(NOW_APP_PATHS_KEY)) ?? "{}";
    const mergedAppJson = mergeAppPathsJson(
      appSpecificNowFiles,
      localPathsJson,
    );
    const lastResolvedPath = await LocalStorage.getItem<string>(
      NOW_LAST_RESOLVED_PATH_KEY,
    );

    const [docPath, app] = await Promise.all([
      getCurrentDocumentPath(),
      getFrontmostApplication().catch(() => null),
    ]);
    setCurrentDocumentPath(docPath ?? null);
    setCurrentApp(app ? { name: app.name, bundleId: app.bundleId } : null);

    const result = resolveNowPathFromContext({
      defaultPath,
      useGlobal,
      mergedAppJson,
      app: app ? { name: app.name, bundleId: app.bundleId } : null,
      lastResolvedPath: lastResolvedPath ?? null,
      documentPath: docPath ?? undefined,
      documentPathsJson: docPathsJson,
    });

    // #region agent log
    fetch("http://127.0.0.1:7253/ingest/fbc7b931-fa3f-4555-b420-453391a24b98", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "useNowPath.ts:refreshPathFromStorage",
        message: "path resolved",
        data: { resolvedPath: result.path, useGlobal, defaultPath, hypothesisId: "E" },
        timestamp: Date.now(),
        sessionId: "debug-session",
      }),
    }).catch(() => {});
    // #endregion
    setNowFilePath(result.path);
    setSourceLabel(result.sourceLabel);
    setAppPathForCurrent(result.appPathForCurrent ?? null);
    setDocPathForCurrent(result.docPathForCurrent ?? null);

    if (!useGlobal && result.path !== defaultPath) {
      await LocalStorage.setItem(NOW_LAST_RESOLVED_PATH_KEY, result.path);
    }
  }, [defaultPath, appSpecificNowFiles]);

  useEffect(() => {
    let cancelled = false;
    refreshPathFromStorage().then(() => {
      if (!cancelled) setPathReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshPathFromStorage]);

  return {
    nowFilePath,
    setNowFilePath,
    sourceLabel,
    setSourceLabel,
    currentApp,
    currentDocumentPath,
    appPathForCurrent,
    docPathForCurrent,
    pathReady,
    refreshPathFromStorage,
  };
}
