/**
 * Legacy Node watcher for now files (reference only). The extension uses the Swift binary
 * (assets/now-watcher from NowWatcher.swift) which writes JSON { ts, app? } to dirtyPath
 * so the menu bar can resolve path from the activating app. This script writes a plain
 * timestamp; the menu bar treats missing app as "resolve from frontmost app".
 *
 * Config: { paths: string[], deeplink: string, port?: number, dirtyPath?: string }. Default port 9847.
 * On file change: debounce 300ms then write to dirtyPath and open(deeplink).
 */
const fs = require("fs");
const http = require("http");
const path = require("path");
const { execFile } = require("child_process");

const DEFAULT_PORT = 9847;
const DEBOUNCE_MS = 300;

function loadConfig(configPath) {
  const raw = fs.readFileSync(configPath, "utf-8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data.paths) || typeof data.deeplink !== "string") {
    throw new Error("Config must have paths (array) and deeplink (string)");
  }
  const dirtyPath =
    typeof data.dirtyPath === "string"
      ? data.dirtyPath
      : path.join(path.dirname(configPath), "now-watcher-dirty.txt");
  return {
    paths: data.paths,
    deeplink: data.deeplink,
    port: typeof data.port === "number" ? data.port : DEFAULT_PORT,
    dirtyPath,
  };
}

function startServer(port) {
  return http
    .createServer((req, res) => {
      if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200);
        res.end();
      } else {
        res.writeHead(404);
        res.end();
      }
    })
    .listen(port);
}

const watchers = new Map();
let debounceTimer = null;

function unwatchAll() {
  for (const [path, w] of watchers) {
    try {
      w.close();
    } catch (_) { }
    watchers.delete(path);
  }
}

function watchPath(path, onChange) {
  if (watchers.has(path)) return;
  try {
    const w = fs.watch(path, (event, filename) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(onChange, DEBOUNCE_MS);
    });
    watchers.set(path, w);
  } catch (err) {
    // ENOENT or other; skip this path
  }
}

function applyPaths(paths) {
  const set = new Set(paths);
  for (const path of watchers.keys()) {
    if (!set.has(path)) {
      try {
        watchers.get(path).close();
      } catch (_) { }
      watchers.delete(path);
    }
  }
  for (const path of set) {
    watchPath(path, fireDeeplink);
  }
}

let currentDeeplink = null;
let currentDirtyPath = null;

function fireDeeplink() {
  debounceTimer = null;
  if (currentDirtyPath) {
    try {
      fs.writeFileSync(currentDirtyPath, String(Date.now()), "utf8");
    } catch (_) { }
  }
  if (currentDeeplink) {
    execFile("open", [currentDeeplink], { stdio: "ignore" }, () => { });
  }
}

function run(configPath) {
  let config = loadConfig(configPath);
  currentDeeplink = config.deeplink;
  currentDirtyPath = config.dirtyPath;
  const server = startServer(config.port);

  applyPaths(config.paths);

  function reloadConfig() {
    try {
      config = loadConfig(configPath);
      currentDeeplink = config.deeplink;
      currentDirtyPath = config.dirtyPath;
      applyPaths(config.paths);
    } catch (_) { }
  }

  try {
    fs.watch(configPath, (event, filename) => {
      if (event === "change") reloadConfig();
    });
  } catch (_) { }

  process.on("SIGINT", () => {
    unwatchAll();
    server.close();
    process.exit(0);
  });
}

const configPath = process.env.NOW_WATCHER_CONFIG;
if (!configPath) {
  console.error("NOW_WATCHER_CONFIG is not set");
  process.exit(1);
}
try {
  run(configPath);
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
