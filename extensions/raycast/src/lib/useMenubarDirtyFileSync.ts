/**
 * Menu-bar dirty-file sync: on mount read dirty file and refresh path if recent app switch;
 * watch dirty file with chokidar and refresh when the Swift watcher writes.
 */
import { useEffect, useRef } from "react";
import chokidar from "chokidar";
import {
  getWatcherDirtyPath,
  readWatcherDirtyFileSync,
} from "./watcherClient";

type UseMenubarDirtyFileSyncArgs = {
  storageReady: boolean;
  supportPath: string;
  refreshPathFromStorage: () => Promise<void>;
  refreshPathFromStorageWithApp: (app: {
    bundleId?: string;
    name: string;
  }) => Promise<void>;
  refresh: () => void | Promise<void>;
};

export function useMenubarDirtyFileSync({
  storageReady,
  supportPath,
  refreshPathFromStorage,
  refreshPathFromStorageWithApp,
  refresh,
}: UseMenubarDirtyFileSyncArgs): void {
  const mountReadDoneRef = useRef(false);

  // On mount (e.g. when launched via deeplink after app switch), resolve path from dirty file if recent.
  useEffect(() => {
    if (!storageReady || mountReadDoneRef.current) return;
    mountReadDoneRef.current = true;
    const dirtyPath = getWatcherDirtyPath(supportPath);
    const data = readWatcherDirtyFileSync(dirtyPath);
    if (data && Date.now() - data.ts < 60_000 && data.app?.name) {
      void refreshPathFromStorageWithApp({
        bundleId: data.app.bundleId,
        name: data.app.name,
      });
    }
  }, [storageReady, supportPath, refreshPathFromStorageWithApp]);

  // When the Swift watcher writes to the dirty file, refresh.
  useEffect(() => {
    if (!storageReady) return;
    const dirtyPath = getWatcherDirtyPath(supportPath);
    const watcher = chokidar.watch(dirtyPath, { persistent: true });
    const onChange = () => {
      const data = readWatcherDirtyFileSync(dirtyPath);
      if (data?.app?.name) {
        void refreshPathFromStorageWithApp(data.app).then(() => refresh());
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
    supportPath,
    refresh,
    refreshPathFromStorage,
    refreshPathFromStorageWithApp,
  ]);
}
