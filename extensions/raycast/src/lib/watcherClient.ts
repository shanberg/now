/**
 * Client for the now-file watcher process. Writes config and ensures the watcher
 * is running so the menu bar can re-run when registered now files change.
 */
import { execSync, spawn } from "child_process";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import {
  mergeAppPathsJson,
  parseJsonToRecord,
  resolveNowFilePath,
} from "./now";

/** Port the watcher HTTP server binds to (health check). */
export const WATCHER_PORT = 9847;

/** Fixed PID file path so we can kill the watcher from any extension run (dev vs installed) and respawn with our config. */
export function getWatcherPidPath(): string {
  return join(process.env.TMPDIR ?? "/tmp", `now-watcher-${WATCHER_PORT}.pid`);
}

/** Config filename written under supportPath. */
export const WATCHER_CONFIG_FILENAME = "now-watcher.json";

/** Filename for dirty signal: watcher writes to it on file change or app activation; menu bar watches it for in-process refresh. */
export const NOW_WATCHER_DIRTY_FILENAME = "now-watcher-dirty.txt";

/**
 * Path to the dirty file the menu bar watches (chokidar). The Swift watcher (and this client when resetting) write JSON:
 * { ts: number, app?: { bundleId?: string, name: string } }. Must be a JSON object (not a bare number).
 * Legacy Node watcher (watcher.js) writes a bare number (timestamp); menu bar treats non-object as "no app" and resolves from frontmost app.
 * When app is present and recent, menu bar resolves path using that app (so deeplink-after-switch shows the right file).
 */
export function getWatcherDirtyPath(supportPath: string): string {
  return join(supportPath, NOW_WATCHER_DIRTY_FILENAME);
}

/**
 * Collects all registered now-file paths: default + app paths (prefs + storage merged)
 * + document paths, each resolved and deduped.
 */
export function collectPathsToWatch(
  defaultPath: string,
  appPathsJson: string | undefined,
  docPathsJson: string | undefined,
  appSpecificNowFiles: string | undefined,
): string[] {
  const mergedApp = mergeAppPathsJson(appSpecificNowFiles, appPathsJson);
  const appPaths = Object.values(parseJsonToRecord(mergedApp)).map(
    resolveNowFilePath,
  );
  const docPaths = Object.values(parseJsonToRecord(docPathsJson)).map(
    resolveNowFilePath,
  );
  const defaultResolved = defaultPath ? resolveNowFilePath(defaultPath) : "";
  const all = [defaultResolved, ...appPaths, ...docPaths].filter(Boolean);
  return [...new Set(all)];
}

/**
 * Writes watcher config and spawns the watcher if the health check fails.
 * No-op when paths.length === 0. Fire-and-forget; does not await the child.
 */
export function ensureWatcherRunning(
  supportPath: string,
  assetsPath: string,
  paths: string[],
  deeplink: string,
): void {
  if (paths.length === 0) return;

  mkdirSync(supportPath, { recursive: true });
  const configPath = join(supportPath, WATCHER_CONFIG_FILENAME);
  const dirtyPath = getWatcherDirtyPath(supportPath);
  const pidPath = getWatcherPidPath();
  const config = { paths, deeplink, port: WATCHER_PORT, dirtyPath, pidPath };
  writeFileSync(configPath, JSON.stringify(config), "utf-8");

  const healthUrl = `http://127.0.0.1:${WATCHER_PORT}/health`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 500);

  fetch(healthUrl, { signal: controller.signal })
    .then((res) => {
      clearTimeout(timeoutId);
      if (res.ok) return;
      killAndSpawn();
    })
    .catch(() => {
      clearTimeout(timeoutId);
      killAndSpawn();
    });

  function killAndSpawn() {
    writeFileSync(dirtyPath, '{"ts":0}', "utf-8");
    try {
      const out = execSync(`lsof -ti :${WATCHER_PORT}`, { encoding: "utf-8" });
      const pids = out.trim().split(/\s+/).filter(Boolean);
      for (const s of pids) {
        const pid = parseInt(s, 10);
        if (!Number.isNaN(pid) && pid > 0) process.kill(pid, "SIGTERM");
      }
    } catch {
      // no process on port
    }
    try {
      const pidStr = readFileSync(pidPath, "utf-8").trim();
      const pid = parseInt(pidStr, 10);
      if (!Number.isNaN(pid) && pid > 0) process.kill(pid, "SIGTERM");
    } catch {
      // no pid file or process already gone
    }
    setTimeout(() => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 500);
      fetch(healthUrl, { signal: ctrl.signal })
        .then((r) => {
          clearTimeout(t);
          if (!r.ok) spawnWatcher(assetsPath, configPath);
        })
        .catch(() => {
          clearTimeout(t);
          spawnWatcher(assetsPath, configPath);
        });
    }, 300);
  }
}

function spawnWatcher(assetsPath: string, configPath: string): void {
  const binaryPath = join(assetsPath, "now-watcher");
  // Detach so the watcher survives after the extension command exits (Raycast tears down the parent).
  const child = spawn(binaryPath, [], {
    env: { ...process.env, NOW_WATCHER_CONFIG: configPath },
    stdio: "ignore",
    detached: true,
  });
  child.unref();
}
