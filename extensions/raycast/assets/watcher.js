"use strict";
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

function parseConfig(configPath, raw) {
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

function loadConfig(configPath) {
  const raw = fs.readFileSync(configPath, "utf-8");
  return parseConfig(configPath, raw);
}

function healthHandler(req, res) {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200);
    res.end();
  } else {
    res.writeHead(404);
    res.end();
  }
}

function startServer(port) {
  return http.createServer(healthHandler).listen(port);
}

const watchers = new Map();
let debounceTimer = null;
let currentDeeplink = null;
let currentDirtyPath = null;

/** Closes all path watchers and clears the map. */
function unwatchAll() {
  for (const [p, w] of watchers) {
    try {
      w.close();
    } catch (_) { }
    watchers.delete(p);
  }
}

function scheduleDebouncedChange(onChange) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(onChange, DEBOUNCE_MS);
}

/** Starts watching one path; debounces changes and calls onChange after DEBOUNCE_MS. */
function watchPath(filePath, onChange) {
  if (watchers.has(filePath)) return;
  try {
    const w = fs.watch(filePath, () => scheduleDebouncedChange(onChange));
    watchers.set(filePath, w);
  } catch (err) {
    // ENOENT or other; skip this path
  }
}

/** Syncs watchers to the given paths: remove watchers not in set, add watchers for new paths. */
function applyPaths(paths) {
  const set = new Set(paths);
  for (const p of watchers.keys()) {
    if (!set.has(p)) {
      try {
        watchers.get(p).close();
      } catch (_) { }
      watchers.delete(p);
    }
  }
  for (const p of set) {
    watchPath(p, fireDeeplink);
  }
}

/** Writes timestamp to dirtyPath (if set), then opens deeplink. Called after debounced file change. */
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

/** Reloads config from disk and updates current deeplink, dirtyPath, and watched paths. */
function reloadConfig(configPath) {
  try {
    const config = loadConfig(configPath);
    currentDeeplink = config.deeplink;
    currentDirtyPath = config.dirtyPath;
    applyPaths(config.paths);
  } catch (_) { }
}

/** Watches config file for changes and reloads on change. */
function watchConfigForReload(configPath) {
  try {
    fs.watch(configPath, (event) => {
      if (event === "change") reloadConfig(configPath);
    });
  } catch (_) { }
}

/** On SIGINT, unwatch all, close server, exit. */
function setupShutdown(server) {
  process.on("SIGINT", () => {
    unwatchAll();
    server.close();
    process.exit(0);
  });
}

function run(configPath) {
  let config = loadConfig(configPath);
  currentDeeplink = config.deeplink;
  currentDirtyPath = config.dirtyPath;
  const server = startServer(config.port);

  applyPaths(config.paths);
  watchConfigForReload(configPath);
  setupShutdown(server);
}

function main() {
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
}

main();
