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

/** Parsed dirty file: ts (ms), optional app. Null if file missing, invalid JSON, or not an object. */
export type WatcherDirtyData = {
  ts: number;
  app?: { bundleId?: string; name: string };
};

function parseDirtyContent(
  parsed: unknown,
): WatcherDirtyData | null {
  const obj =
    parsed != null && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as { ts?: number; app?: { bundleId?: string; name?: string } })
      : null;
  if (!obj) return null;
  const ts = typeof obj.ts === "number" ? obj.ts : 0;
  const app =
    obj.app != null && typeof obj.app.name === "string"
      ? { bundleId: obj.app.bundleId, name: obj.app.name }
      : undefined;
  return { ts, app };
}

/** Reads and parses the dirty file. Returns null on read/parse error or when content is not a JSON object. */
export function readWatcherDirtyFileSync(
  filePath: string,
): WatcherDirtyData | null {
  try {
    const raw = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    return parseDirtyContent(parsed);
  } catch {
    return null;
  }
}

/**
 * Collects all registered now-file paths: default + app paths (prefs + storage merged)
 * + app paths, each resolved and deduped.
 */
export function collectPathsToWatch(
  defaultPath: string,
  appPathsJson: string | undefined,
  appSpecificNowFiles: string | undefined,
): string[] {
  const mergedApp = mergeAppPathsJson(appSpecificNowFiles, appPathsJson);
  const appPaths = Object.values(parseJsonToRecord(mergedApp)).map(
    resolveNowFilePath,
  );
  const defaultResolved = defaultPath ? resolveNowFilePath(defaultPath) : "";
  const all = [defaultResolved, ...appPaths].filter(Boolean);
  return [...new Set(all)];
}

/** Kills processes listening on the given port (lsof -ti :port). No-op if none or lsof fails. */
function killProcessesOnPort(port: number): void {
  try {
    const out = execSync(`lsof -ti :${port}`, { encoding: "utf-8" });
    const pids = out.trim().split(/\s+/).filter(Boolean);
    for (const s of pids) {
      const pid = parseInt(s, 10);
      if (!Number.isNaN(pid) && pid > 0) process.kill(pid, "SIGTERM");
    }
  } catch {
    // no process on port
  }
}

/** Kills the process whose PID is stored in the file. No-op if file missing or invalid. */
function killPidFromFile(pidPath: string): void {
  try {
    const pidStr = readFileSync(pidPath, "utf-8").trim();
    const pid = parseInt(pidStr, 10);
    if (!Number.isNaN(pid) && pid > 0) process.kill(pid, "SIGTERM");
  } catch {
    // no pid file or process already gone
  }
}

/** After delayMs, health-check the URL; if not ok or fetch fails, spawn the watcher. */
function spawnWatcherIfUnhealthy(
  healthUrl: string,
  assetsPath: string,
  configPath: string,
  delayMs: number,
): void {
  setTimeout(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 500);
    fetch(healthUrl, { signal: controller.signal })
      .then((res) => {
        clearTimeout(timeoutId);
        if (!res.ok) spawnWatcher(assetsPath, configPath);
      })
      .catch(() => {
        clearTimeout(timeoutId);
        spawnWatcher(assetsPath, configPath);
      });
  }, delayMs);
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

  const killAndSpawn = (): void => {
    writeFileSync(dirtyPath, '{"ts":0}', "utf-8");
    killProcessesOnPort(WATCHER_PORT);
    killPidFromFile(pidPath);
    spawnWatcherIfUnhealthy(healthUrl, assetsPath, configPath, 300);
  };

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
