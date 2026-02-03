import { getFrontmostApplication } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getCurrentDocumentPath,
  mergeAppPathsJson,
  NOW_APP_PATHS_KEY,
  NOW_DOCUMENT_PATHS_KEY,
  NOW_LAST_RESOLVED_PATH_KEY,
  NOW_USE_GLOBAL_KEY,
  parseJsonToRecord,
  resolveNowPathFromContext,
} from "./now";

/**
 * Options for {@link useNowPathFromStorage}.
 *
 * @property defaultPath - Resolved path for the global (preference) Now file. Used when useGlobal is true or when no app/document path is resolved.
 * @property appSpecificNowFiles - Optional JSON string mapping app bundle ID or name to Now file path (merged with user storage). When set, the frontmost app can drive which file is active.
 */
export type UseNowPathOptions = {
  defaultPath: string;
  appSpecificNowFiles?: string;
};

/**
 * Return value of {@link useNowPathFromStorage}.
 *
 * **Returned object** is stable across rerenders when path resolution and storage inputs are unchanged (pathContext and options.defaultPath unchanged). Memoizing the return object avoids downstream rerenders when only prefs or other non-path deps change.
 * **Stable callbacks** (same reference unless deps change): `refreshPathFromStorage`, `setUseGlobal`, `setLastResolvedPath`, `addAppPathMapping`, `addDocumentPathMapping`, `setNowFilePath`, `setSourceLabel`.
 *
 * @property nowFilePath - Currently active Now file path (result of resolution).
 * @property setNowFilePath - Direct setter for nowFilePath (e.g. menu bar switching context).
 * @property sourceLabel - Human-readable label for the current source (e.g. "Global", "Document — path", "Last used — path").
 * @property setSourceLabel - Setter for sourceLabel.
 * @property currentApp - Frontmost application { name, bundleId } or null.
 * @property currentDocumentPath - Path of the frontmost app's current document, or null.
 * @property appPathForCurrent - Resolved Now path for the current app if mapped, else null.
 * @property docPathForCurrent - Resolved Now path for the current document if mapped, else null.
 * @property pathReady - True after first resolution has completed (storage loaded and runResolution ran).
 * @property refreshPathFromStorage - Re-runs path resolution (app/document + storage). Stable: depends only on setLastResolvedPathValue.
 * @property refreshPathFromStorageWithApp - Re-runs path resolution using the given app (e.g. from watcher) instead of getFrontmostApplication. Use when deeplink may have made Raycast frontmost.
 * @property setUseGlobal - Writes useGlobal to storage ("true" | "false"). Stable.
 * @property setLastResolvedPath - Writes lastResolvedPath to storage. Stable.
 * @property addAppPathMapping - Merges key → nowPath into app paths JSON in storage. Depends on appPathsJson and setAppPathsValue.
 * @property addDocumentPathMapping - Merges documentPath → nowPath into document paths JSON in storage. Depends on docPathsJson and setDocPathsValue.
 */
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
  appPathsJson: string;
  docPathsJson: string;
  refreshPathFromStorage: () => Promise<void>;
  refreshPathFromStorageWithApp: (
    app: { bundleId?: string; name: string },
  ) => Promise<void>;
  setUseGlobal: (useGlobal: boolean) => Promise<void>;
  setLastResolvedPath: (path: string) => Promise<void>;
  addAppPathMapping: (key: string, nowPath: string) => Promise<void>;
  addDocumentPathMapping: (
    documentPath: string,
    nowPath: string,
  ) => Promise<void>;
};

/**
 * Single source of truth for "which Now file is active."
 *
 * **Responsibility**: Reads path-resolution state from Raycast LocalStorage (useGlobal, doc paths, app paths, lastResolvedPath), fetches frontmost app and current document path from the system, and runs {@link resolveNowPathFromContext} to compute the active path and labels. Writes lastResolvedPath to storage when the resolved path comes from app/document (so the next open uses it until the user switches). Used by list-focus and menu-bar-focus so both commands never drift.
 *
 * **When it updates**: Runs resolution (sets pathContext with path and ready: true) when storage has loaded and whenever the storage "signature" changes: `useGlobalRaw | docPathsJson | appPathsJson | lastResolvedPathRaw`. Resolution is debounced (next tick): multiple LS key updates in quick succession (e.g. addDocumentPathMapping + setUseGlobal from one user action) trigger one runResolution after the burst. Skips re-running resolution when the only change is `lastResolvedPathRaw` and it equals the path this hook just wrote (avoids a feedback loop). Resolution itself calls getCurrentDocumentPath and getFrontmostApplication, then resolveNowPathFromContext; state (nowFilePath, sourceLabel, appPathForCurrent, docPathForCurrent, currentApp, currentDocumentPath) updates from that result.
 *
 * **Dependencies**: `@raycast/api` (getFrontmostApplication), `@raycast/utils` (useLocalStorage for NOW_USE_GLOBAL_KEY, NOW_APP_PATHS_KEY, NOW_DOCUMENT_PATHS_KEY, NOW_LAST_RESOLVED_PATH_KEY), and `./now` (getCurrentDocumentPath, mergeAppPathsJson, resolveNowPathFromContext, parseJsonToRecord, storage key constants).
 */

/** Internal: single state slice for resolution result (includes ready). Not exported. */
type PathContextState = {
  nowFilePath: string;
  sourceLabel: string;
  currentApp: { name: string; bundleId?: string } | null;
  currentDocumentPath: string | null;
  appPathForCurrent: string | null;
  docPathForCurrent: string | null;
  ready: boolean;
};

export function useNowPathFromStorage(
  options: UseNowPathOptions,
): UseNowPathResult {
  const { defaultPath, appSpecificNowFiles } = options;
  const [pathContext, setPathContext] = useState<PathContextState | null>(null);

  const {
    value: useGlobalRaw,
    setValue: setUseGlobalValue,
    isLoading: useGlobalLoading,
  } = useLocalStorage<string>(NOW_USE_GLOBAL_KEY, "false");
  const {
    value: docPathsJson,
    setValue: setDocPathsValue,
    isLoading: docPathsLoading,
  } = useLocalStorage<string>(NOW_DOCUMENT_PATHS_KEY, "{}");
  const {
    value: appPathsJson,
    setValue: setAppPathsValue,
    isLoading: appPathsLoading,
  } = useLocalStorage<string>(NOW_APP_PATHS_KEY, "{}");
  const {
    value: lastResolvedPathRaw,
    setValue: setLastResolvedPathValue,
    isLoading: lastResolvedLoading,
  } = useLocalStorage<string>(NOW_LAST_RESOLVED_PATH_KEY, "");

  const storageLoading =
    useGlobalLoading ||
    docPathsLoading ||
    appPathsLoading ||
    lastResolvedLoading;

  const defaultPathRef = useRef(defaultPath);
  const appSpecificNowFilesRef = useRef(appSpecificNowFiles);
  const useGlobalRef = useRef(useGlobalRaw);
  const docPathsRef = useRef(docPathsJson);
  const appPathsRef = useRef(appPathsJson);
  const lastResolvedRef = useRef(lastResolvedPathRaw);
  const lastWrittenResolvedPathRef = useRef<string | null>(null);
  const prevSignatureInputsRef = useRef<string>("");
  const prevStorageSignatureRef = useRef<string>("");
  const resolutionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  defaultPathRef.current = defaultPath;
  appSpecificNowFilesRef.current = appSpecificNowFiles;
  useGlobalRef.current = useGlobalRaw;
  docPathsRef.current = docPathsJson;
  appPathsRef.current = appPathsJson;
  lastResolvedRef.current = lastResolvedPathRaw;

  const runResolution = useCallback(async () => {
    const useGlobal = useGlobalRef.current === "true";
    const mergedAppJson = mergeAppPathsJson(
      appSpecificNowFilesRef.current,
      appPathsRef.current ?? "{}",
    );

    const [docPath, app] = await Promise.all([
      getCurrentDocumentPath(),
      getFrontmostApplication().catch(() => null),
    ]);

    const result = resolveNowPathFromContext({
      defaultPath: defaultPathRef.current,
      useGlobal,
      mergedAppJson,
      app: app ? { name: app.name, bundleId: app.bundleId } : null,
      lastResolvedPath: lastResolvedRef.current ?? null,
      documentPath: docPath ?? undefined,
      documentPathsJson: docPathsRef.current ?? "{}",
    });

    setPathContext({
      nowFilePath: result.path,
      sourceLabel: result.sourceLabel,
      currentApp: app ? { name: app.name, bundleId: app.bundleId } : null,
      currentDocumentPath: docPath ?? null,
      appPathForCurrent: result.appPathForCurrent ?? null,
      docPathForCurrent: result.docPathForCurrent ?? null,
      ready: true,
    });

    const willWriteStorage =
      !useGlobal &&
      result.path !== defaultPathRef.current &&
      result.path !== lastResolvedRef.current;
    if (willWriteStorage) {
      lastWrittenResolvedPathRef.current = result.path;
      await setLastResolvedPathValue(result.path);
    }
  }, [setLastResolvedPathValue]);

  const runResolutionWithAppOverride = useCallback(
    async (overrideApp: { bundleId?: string; name: string }) => {
      const useGlobal = useGlobalRef.current === "true";
      const mergedAppJson = mergeAppPathsJson(
        appSpecificNowFilesRef.current,
        appPathsRef.current ?? "{}",
      );

      const result = resolveNowPathFromContext({
        defaultPath: defaultPathRef.current,
        useGlobal,
        mergedAppJson,
        app: overrideApp,
        lastResolvedPath: lastResolvedRef.current ?? null,
        documentPath: null,
        documentPathsJson: docPathsRef.current ?? "{}",
      });

      setPathContext({
        nowFilePath: result.path,
        sourceLabel: result.sourceLabel,
        currentApp: overrideApp,
        currentDocumentPath: null,
        appPathForCurrent: result.appPathForCurrent ?? null,
        docPathForCurrent: result.docPathForCurrent ?? null,
        ready: true,
      });

      const willWriteStorage =
        !useGlobal &&
        result.path !== defaultPathRef.current &&
        result.path !== lastResolvedRef.current;
      if (willWriteStorage) {
        lastWrittenResolvedPathRef.current = result.path;
        await setLastResolvedPathValue(result.path);
      }
    },
    [setLastResolvedPathValue],
  );

  const signatureInputs = `${useGlobalRaw}|${docPathsJson}|${appPathsJson}`;
  const storageSignature = `${signatureInputs}|${lastResolvedPathRaw}`;

  useEffect(() => {
    if (storageLoading) return;
    const onlyLastPathChanged =
      prevStorageSignatureRef.current !== storageSignature &&
      prevSignatureInputsRef.current === signatureInputs;
    if (
      onlyLastPathChanged &&
      lastResolvedPathRaw === lastWrittenResolvedPathRef.current
    ) {
      prevSignatureInputsRef.current = signatureInputs;
      prevStorageSignatureRef.current = storageSignature;
      return () => { };
    }
    prevSignatureInputsRef.current = signatureInputs;
    prevStorageSignatureRef.current = storageSignature;
    if (resolutionTimeoutRef.current)
      clearTimeout(resolutionTimeoutRef.current);
    resolutionTimeoutRef.current = setTimeout(() => {
      resolutionTimeoutRef.current = null;
      runResolution().then(() => { });
    }, 0);
    return () => {
      if (resolutionTimeoutRef.current) {
        clearTimeout(resolutionTimeoutRef.current);
        resolutionTimeoutRef.current = null;
      }
    };
  }, [storageLoading, storageSignature, runResolution]);

  const setUseGlobal = useCallback(
    (useGlobal: boolean) => setUseGlobalValue(useGlobal ? "true" : "false"),
    [setUseGlobalValue],
  );
  const setLastResolvedPath = useCallback(
    (path: string) => setLastResolvedPathValue(path),
    [setLastResolvedPathValue],
  );
  const addAppPathMapping = useCallback(
    async (key: string, nowPath: string) => {
      const map = parseJsonToRecord(appPathsJson ?? "{}");
      map[key] = nowPath;
      await setAppPathsValue(JSON.stringify(map));
    },
    [appPathsJson, setAppPathsValue],
  );
  const addDocumentPathMapping = useCallback(
    async (documentPath: string, nowPath: string) => {
      const map = parseJsonToRecord(docPathsJson ?? "{}");
      map[documentPath] = nowPath;
      await setDocPathsValue(JSON.stringify(map));
    },
    [docPathsJson, setDocPathsValue],
  );

  const setNowFilePath = useCallback((path: string) => {
    setPathContext((prev: PathContextState | null) =>
      prev
        ? { ...prev, nowFilePath: path }
        : {
          nowFilePath: path,
          sourceLabel: "Global",
          currentApp: null,
          currentDocumentPath: null,
          appPathForCurrent: null,
          docPathForCurrent: null,
          ready: true,
        },
    );
  }, []);
  const setSourceLabel = useCallback((label: string) => {
    setPathContext((prev: PathContextState | null) =>
      prev
        ? { ...prev, sourceLabel: label }
        : {
          nowFilePath: defaultPathRef.current,
          sourceLabel: label,
          currentApp: null,
          currentDocumentPath: null,
          appPathForCurrent: null,
          docPathForCurrent: null,
          ready: true,
        },
    );
  }, []);

  return useMemo(() => {
    const nowFilePath = pathContext?.nowFilePath ?? defaultPath;
    const sourceLabel = pathContext?.sourceLabel ?? "Global";
    const currentApp = pathContext?.currentApp ?? null;
    const currentDocumentPath = pathContext?.currentDocumentPath ?? null;
    const appPathForCurrent = pathContext?.appPathForCurrent ?? null;
    const docPathForCurrent = pathContext?.docPathForCurrent ?? null;
    const pathReady = pathContext?.ready ?? false;
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
      appPathsJson: appPathsJson ?? "{}",
      docPathsJson: docPathsJson ?? "{}",
      refreshPathFromStorage: runResolution,
      refreshPathFromStorageWithApp: runResolutionWithAppOverride,
      setUseGlobal,
      setLastResolvedPath,
      addAppPathMapping,
      addDocumentPathMapping,
    };
  }, [
    pathContext,
    defaultPath,
    appPathsJson,
    docPathsJson,
    setNowFilePath,
    setSourceLabel,
    runResolution,
    runResolutionWithAppOverride,
    setUseGlobal,
    setLastResolvedPath,
    addAppPathMapping,
    addDocumentPathMapping,
  ]);
}
