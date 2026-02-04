import { getFrontmostApplication } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import {
  type MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  mergeAppPathsJson,
  NOW_APP_PATHS_KEY,
  NOW_LAST_RESOLVED_PATH_KEY,
  NOW_USE_GLOBAL_KEY,
  parseJsonToRecord,
  resolveNowPathFromContext,
  type ResolveNowPathResult,
} from "./now";

/**
 * Options for {@link useNowPathFromStorage}.
 *
 * @property defaultPath - Resolved path for the global (preference) Now file. Used when useGlobal is true or when no app path is resolved.
 * @property appSpecificNowFiles - Optional JSON string mapping app bundle ID or name to Now file path (merged with user storage). When set, the frontmost app can drive which file is active.
 */
export type UseNowPathOptions = {
  defaultPath: string;
  appSpecificNowFiles?: string;
};

/**
 * Return value of {@link useNowPathFromStorage}.
 *
 * **Stable callbacks** (same reference unless deps change): `refreshPathFromStorage`, `setUseGlobal`, `setLastResolvedPath`, `addAppPathMapping`, `setNowFilePath`, `setSourceLabel`.
 *
 * @property nowFilePath - Currently active Now file path (result of resolution).
 * @property setNowFilePath - Direct setter for nowFilePath (e.g. menu bar switching context).
 * @property sourceLabel - Human-readable label for the current source (e.g. "Global", "Last used — path", "AppName — path").
 * @property setSourceLabel - Setter for sourceLabel.
 * @property currentApp - Frontmost application { name, bundleId } or null.
 * @property appPathForCurrent - Resolved Now path for the current app if mapped, else null.
 * @property pathReady - True after first resolution has completed (storage loaded and runResolution ran).
 * @property refreshPathFromStorage - Re-runs path resolution (app + storage). Stable: depends only on setLastResolvedPathValue.
 * @property refreshPathFromStorageWithApp - Re-runs path resolution using the given app (e.g. from watcher) instead of getFrontmostApplication. Use when deeplink may have made Raycast frontmost.
 * @property setUseGlobal - Writes useGlobal to storage ("true" | "false"). Stable.
 * @property setLastResolvedPath - Writes lastResolvedPath to storage. Stable.
 * @property addAppPathMapping - Merges key → nowPath into app paths JSON in storage. Depends on appPathsJson and setAppPathsValue.
 */
export type UseNowPathResult = {
  nowFilePath: string;
  setNowFilePath: (path: string) => void;
  sourceLabel: string;
  setSourceLabel: (label: string) => void;
  currentApp: { name: string; bundleId?: string } | null;
  appPathForCurrent: string | null;
  pathReady: boolean;
  appPathsJson: string;
  refreshPathFromStorage: () => Promise<void>;
  refreshPathFromStorageWithApp: (
    app: { bundleId?: string; name: string },
  ) => Promise<void>;
  setUseGlobal: (useGlobal: boolean) => Promise<void>;
  setLastResolvedPath: (path: string) => Promise<void>;
  addAppPathMapping: (key: string, nowPath: string) => Promise<void>;
};

/**
 * Single source of truth for "which Now file is active."
 *
 * **Responsibility**: Reads path-resolution state from Raycast LocalStorage (useGlobal, app paths, lastResolvedPath), fetches frontmost app from the system, and runs {@link resolveNowPathFromContext} to compute the active path and labels. Writes lastResolvedPath to storage when the resolved path comes from app (so the next open uses it until the user switches). Used by list-focus and menu-bar-focus so both commands never drift.
 *
 * **When it updates**: Runs resolution when storage has loaded and whenever the storage "signature" changes: `useGlobalRaw | appPathsJson | lastResolvedPathRaw`. Resolution calls getFrontmostApplication then resolveNowPathFromContext.
 *
 * **Dependencies**: `@raycast/api` (getFrontmostApplication), `@raycast/utils` (useLocalStorage for NOW_USE_GLOBAL_KEY, NOW_APP_PATHS_KEY, NOW_LAST_RESOLVED_PATH_KEY), and `./now` (mergeAppPathsJson, resolveNowPathFromContext, parseJsonToRecord, storage key constants).
 */

/** Internal: single state slice for resolution result (includes ready). Not exported. */
type PathContextState = {
  nowFilePath: string;
  sourceLabel: string;
  currentApp: { name: string; bundleId?: string } | null;
  appPathForCurrent: string | null;
  ready: boolean;
};

function defaultPathContextState(overrides: Partial<PathContextState> & { nowFilePath: string }): PathContextState {
  return {
    nowFilePath: overrides.nowFilePath,
    sourceLabel: overrides.sourceLabel ?? "Global",
    currentApp: overrides.currentApp ?? null,
    appPathForCurrent: overrides.appPathForCurrent ?? null,
    ready: overrides.ready ?? true,
  };
}

/** Build UseNowPathResult from current state and callbacks. */
function buildNowPathResult(
  pathContext: PathContextState | null,
  defaultPath: string,
  appPathsJson: string,
  stable: {
    setNowFilePath: (path: string) => void;
    setSourceLabel: (label: string) => void;
    refreshPathFromStorage: () => Promise<void>;
    refreshPathFromStorageWithApp: (
      app: { bundleId?: string; name: string },
    ) => Promise<void>;
    setUseGlobal: (useGlobal: boolean) => Promise<void>;
    setLastResolvedPath: (path: string) => Promise<void>;
    addAppPathMapping: (key: string, nowPath: string) => Promise<void>;
  },
): UseNowPathResult {
  const nowFilePath = pathContext?.nowFilePath ?? defaultPath;
  const sourceLabel = pathContext?.sourceLabel ?? "Global";
  const currentApp = pathContext?.currentApp ?? null;
  const appPathForCurrent = pathContext?.appPathForCurrent ?? null;
  const pathReady = pathContext?.ready ?? false;
  return {
    nowFilePath,
    setNowFilePath: stable.setNowFilePath,
    sourceLabel,
    setSourceLabel: stable.setSourceLabel,
    currentApp,
    appPathForCurrent,
    pathReady,
    appPathsJson: appPathsJson ?? "{}",
    refreshPathFromStorage: stable.refreshPathFromStorage,
    refreshPathFromStorageWithApp: stable.refreshPathFromStorageWithApp,
    setUseGlobal: stable.setUseGlobal,
    setLastResolvedPath: stable.setLastResolvedPath,
    addAppPathMapping: stable.addAppPathMapping,
  };
}

/** True when we should skip resolution to avoid feedback loop (we just wrote lastResolvedPath). */
function shouldSkipResolutionBecauseWeWrote(
  prevSignatureInputs: string,
  prevStorageSignature: string,
  storageSignature: string,
  signatureInputs: string,
  lastResolvedPathRaw: string,
  lastWrittenPath: string | null,
): boolean {
  const onlyLastPathChanged =
    prevStorageSignature !== storageSignature &&
    prevSignatureInputs === signatureInputs;
  return (
    onlyLastPathChanged && lastResolvedPathRaw === lastWrittenPath
  );
}

/**
 * Runs runResolution when storage signature changes, debounced (next tick).
 * Skips when only lastResolvedPath changed and it equals lastWrittenPath (avoids feedback loop after we write).
 */
function useDebouncedPathResolution(
  storageLoading: boolean,
  storageSignature: string,
  signatureInputs: string,
  lastResolvedPathRaw: string,
  lastWrittenResolvedPathRef: { current: string | null },
  runResolution: () => Promise<void>,
): void {
  const prevSignatureInputsRef = useRef<string>("");
  const prevStorageSignatureRef = useRef<string>("");
  const resolutionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    if (storageLoading) return;

    const shouldSkip = shouldSkipResolutionBecauseWeWrote(
      prevSignatureInputsRef.current,
      prevStorageSignatureRef.current,
      storageSignature,
      signatureInputs,
      lastResolvedPathRaw,
      lastWrittenResolvedPathRef.current,
    );
    prevSignatureInputsRef.current = signatureInputs;
    prevStorageSignatureRef.current = storageSignature;

    if (shouldSkip) return;

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
  }, [storageLoading, storageSignature, lastResolvedPathRaw, runResolution]);
}

/** Refs kept in sync with storage and options for use inside resolution callbacks. */
type NowPathStorageRefs = {
  defaultPath: MutableRefObject<string>;
  appSpecificNowFiles: MutableRefObject<string | undefined>;
  useGlobal: MutableRefObject<string>;
  appPaths: MutableRefObject<string>;
  lastResolvedPath: MutableRefObject<string>;
  lastWrittenResolvedPath: MutableRefObject<string | null>;
};

/** Updates path context from resolution result and optionally persists lastResolvedPath to storage. */
async function applyResolutionResult(
  result: ResolveNowPathResult,
  override: { app: { name: string; bundleId?: string } | null },
  refs: NowPathStorageRefs,
  setPathContext: (updater: (prev: PathContextState | null) => PathContextState | null) => void,
  setLastResolvedPathValue: (path: string) => Promise<void>,
): Promise<void> {
  setPathContext(() => ({
    nowFilePath: result.path,
    sourceLabel: result.sourceLabel,
    currentApp: override.app,
    appPathForCurrent: result.appPathForCurrent ?? null,
    ready: true,
  }));
  const useGlobal = refs.useGlobal.current === "true";
  const willWriteStorage =
    !useGlobal &&
    result.path !== refs.defaultPath.current &&
    result.path !== refs.lastResolvedPath.current;
  if (willWriteStorage) {
    refs.lastWrittenResolvedPath.current = result.path;
    await setLastResolvedPathValue(result.path);
  }
}

function useNowPathStorage(options: UseNowPathOptions) {
  const { defaultPath, appSpecificNowFiles } = options;

  const { value: useGlobalRaw, setValue: setUseGlobalValue, isLoading: useGlobalLoading } =
    useLocalStorage<string>(NOW_USE_GLOBAL_KEY, "false");
  const { value: appPathsJson, setValue: setAppPathsValue, isLoading: appPathsLoading } =
    useLocalStorage<string>(NOW_APP_PATHS_KEY, "{}");
  const { value: lastResolvedPathRaw, setValue: setLastResolvedPathValue, isLoading: lastResolvedLoading } =
    useLocalStorage<string>(NOW_LAST_RESOLVED_PATH_KEY, "");

  const defaultPathRef = useRef(defaultPath);
  const appSpecificNowFilesRef = useRef(appSpecificNowFiles);
  const useGlobalRef = useRef(useGlobalRaw);
  const appPathsRef = useRef(appPathsJson);
  const lastResolvedPathRef = useRef(lastResolvedPathRaw);
  const lastWrittenResolvedPathRef = useRef<string | null>(null);
  defaultPathRef.current = defaultPath;
  appSpecificNowFilesRef.current = appSpecificNowFiles;
  useGlobalRef.current = useGlobalRaw;
  appPathsRef.current = appPathsJson;
  lastResolvedPathRef.current = lastResolvedPathRaw;

  const refs: NowPathStorageRefs = {
    defaultPath: defaultPathRef,
    appSpecificNowFiles: appSpecificNowFilesRef,
    useGlobal: useGlobalRef,
    appPaths: appPathsRef,
    lastResolvedPath: lastResolvedPathRef,
    lastWrittenResolvedPath: lastWrittenResolvedPathRef,
  };

  const storageLoading =
    useGlobalLoading || appPathsLoading || lastResolvedLoading;
  const signatureInputs = `${useGlobalRaw}|${appPathsJson}`;
  const storageSignature = `${signatureInputs}|${lastResolvedPathRaw}`;

  return {
    storageLoading,
    signatureInputs,
    storageSignature,
    lastResolvedPathRaw,
    useGlobalRaw,
    appPathsJson,
    refs,
    setUseGlobalValue,
    setAppPathsValue,
    setLastResolvedPathValue,
  };
}

export function useNowPathFromStorage(
  options: UseNowPathOptions,
): UseNowPathResult {
  const { defaultPath } = options;
  const [pathContext, setPathContext] = useState<PathContextState | null>(null);
  const storage = useNowPathStorage(options);
  const { refs } = storage;

  const runResolutionCore = useCallback(
    async (override: { app: { name: string; bundleId?: string } | null }) => {
      const useGlobal = refs.useGlobal.current === "true";
      const mergedAppJson = mergeAppPathsJson(
        refs.appSpecificNowFiles.current,
        refs.appPaths.current ?? "{}",
      );
      const result = resolveNowPathFromContext({
        defaultPath: refs.defaultPath.current,
        useGlobal,
        mergedAppJson,
        app: override.app,
        lastResolvedPath: refs.lastResolvedPath.current ?? null,
      });
      await applyResolutionResult(
        result,
        override,
        refs,
        setPathContext,
        storage.setLastResolvedPathValue,
      );
    },
    [storage.setLastResolvedPathValue],
  );

  const runResolution = useCallback(async () => {
    const app = await getFrontmostApplication().catch(() => null);
    await runResolutionCore({
      app: app ? { name: app.name, bundleId: app.bundleId } : null,
    });
  }, [runResolutionCore]);

  const runResolutionWithAppOverride = useCallback(
    async (overrideApp: { bundleId?: string; name: string }) => {
      await runResolutionCore({ app: overrideApp });
    },
    [runResolutionCore],
  );

  useDebouncedPathResolution(
    storage.storageLoading,
    storage.storageSignature,
    storage.signatureInputs,
    storage.lastResolvedPathRaw,
    refs.lastWrittenResolvedPath,
    runResolution,
  );

  const setUseGlobal = useCallback(
    (useGlobal: boolean) => storage.setUseGlobalValue(useGlobal ? "true" : "false"),
    [storage.setUseGlobalValue],
  );
  const setLastResolvedPath = useCallback(
    (path: string) => storage.setLastResolvedPathValue(path),
    [storage.setLastResolvedPathValue],
  );
  const addAppPathMapping = useCallback(
    async (key: string, nowPath: string) => {
      const map = parseJsonToRecord(storage.appPathsJson ?? "{}");
      map[key] = nowPath;
      await storage.setAppPathsValue(JSON.stringify(map));
    },
    [storage.appPathsJson, storage.setAppPathsValue],
  );

  const setNowFilePath = useCallback((path: string) => {
    setPathContext((prev: PathContextState | null) =>
      prev ? { ...prev, nowFilePath: path } : defaultPathContextState({ nowFilePath: path }),
    );
  }, []);
  const setSourceLabel = useCallback((label: string) => {
    setPathContext((prev: PathContextState | null) =>
      prev
        ? { ...prev, sourceLabel: label }
        : defaultPathContextState({ nowFilePath: refs.defaultPath.current, sourceLabel: label }),
    );
  }, [refs.defaultPath]);

  const stableCallbacks = {
    setNowFilePath,
    setSourceLabel,
    refreshPathFromStorage: runResolution,
    refreshPathFromStorageWithApp: runResolutionWithAppOverride,
    setUseGlobal,
    setLastResolvedPath,
    addAppPathMapping,
  };

  return buildNowPathResult(
    pathContext,
    defaultPath,
    storage.appPathsJson ?? "{}",
    stableCallbacks,
  );
}
