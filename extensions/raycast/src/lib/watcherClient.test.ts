/**
 * Tests for collectPathsToWatch and ensureWatcherRunning.
 */
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { describe, expect, it, vi } from "vitest";
import {
  collectPathsToWatch,
  getWatcherDirtyPath,
  NOW_WATCHER_DIRTY_FILENAME,
  readWatcherDirtyFileSync,
  WATCHER_CONFIG_FILENAME,
  WATCHER_PORT,
} from "./watcherClient";

describe("collectPathsToWatch", () => {
  it("returns defaultPath only when app JSON is empty", () => {
    const paths = collectPathsToWatch(
      "/home/.now/focus.now.md",
      "{}",
      undefined,
    );
    expect(paths).toHaveLength(1);
    expect(paths[0]).toContain("focus.now.md");
  });

  it("merges app paths from prefs and storage and dedupes", () => {
    const defaultPath = "/default";
    const appPathsJson = '{"com.apple.Terminal": "~/term.now.md"}';
    const appSpecificNowFiles = '{"com.other": "~/other.now.md"}';
    const paths = collectPathsToWatch(
      defaultPath,
      appPathsJson,
      appSpecificNowFiles,
    );
    expect(paths.length).toBeGreaterThanOrEqual(2);
    expect(paths).toContain(paths[0]); // default resolved
    const termResolved = paths.find((p) => p.includes("term.now.md"));
    const otherResolved = paths.find((p) => p.includes("other.now.md"));
    expect(termResolved).toBeDefined();
    expect(otherResolved).toBeDefined();
  });

  it("returns empty array when defaultPath is empty and no mappings", () => {
    const paths = collectPathsToWatch("", "{}", undefined);
    expect(paths).toEqual([]);
  });
});

describe("readWatcherDirtyFileSync", () => {
  it("returns { ts, app } for valid object with app", () => {
    const dir = join(
      process.env.TMPDIR ?? "/tmp",
      "now-watcher-dirty-test-" + Date.now(),
    );
    mkdirSync(dir, { recursive: true });
    const filePath = join(dir, "dirty.txt");
    writeFileSync(
      filePath,
      JSON.stringify({
        ts: 12345,
        app: { bundleId: "com.test", name: "Test" },
      }),
      "utf-8",
    );
    const data = readWatcherDirtyFileSync(filePath);
    expect(data).not.toBeNull();
    expect(data!.ts).toBe(12345);
    expect(data!.app?.name).toBe("Test");
    expect(data!.app?.bundleId).toBe("com.test");
  });

  it("returns { ts } for bare number timestamp", () => {
    const dir = join(
      process.env.TMPDIR ?? "/tmp",
      "now-watcher-dirty-test-" + Date.now(),
    );
    mkdirSync(dir, { recursive: true });
    const filePath = join(dir, "dirty2.txt");
    writeFileSync(filePath, "999", "utf-8");
    expect(readWatcherDirtyFileSync(filePath)).toEqual({ ts: 999 });
  });

  it("returns null for missing file", () => {
    expect(
      readWatcherDirtyFileSync("/nonexistent/dirty-" + Date.now()),
    ).toBeNull();
  });
});

describe("watcherClient constants", () => {
  it("exports WATCHER_PORT and WATCHER_CONFIG_FILENAME", () => {
    expect(WATCHER_PORT).toBe(9847);
    expect(WATCHER_CONFIG_FILENAME).toBe("now-watcher.json");
  });

  it("getWatcherDirtyPath returns path under supportPath", () => {
    expect(getWatcherDirtyPath("/tmp/support")).toBe(
      `/tmp/support/${NOW_WATCHER_DIRTY_FILENAME}`,
    );
    expect(NOW_WATCHER_DIRTY_FILENAME).toBe("now-watcher-dirty.txt");
  });
});

describe("ensureWatcherRunning", () => {
  it("writes config with paths, deeplink, port, dirtyPath when health check fails", async () => {
    const supportPath = join(
      process.env.TMPDIR ?? "/tmp",
      "now-watcher-test-" + Date.now(),
    );
    const assetsPath = join(
      process.env.TMPDIR ?? "/tmp",
      "now-watcher-assets-" + Date.now(),
    );
    mkdirSync(assetsPath, { recursive: true });
    const dummyBinary = join(assetsPath, "now-watcher");
    writeFileSync(dummyBinary, "#!/bin/sh\nexit 0\n", "utf-8");
    chmodSync(dummyBinary, 0o755);

    const paths = ["/fake/path.now.md"];
    const deeplink = "raycast://extensions/now/menu-bar-focus";

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new Error("health check fail")) as typeof fetch;

    const { ensureWatcherRunning } = await import("./watcherClient");
    ensureWatcherRunning(supportPath, assetsPath, paths, deeplink);
    await new Promise((r) => setTimeout(r, 100));

    globalThis.fetch = originalFetch;

    const configPath = join(supportPath, WATCHER_CONFIG_FILENAME);
    const configJson = readFileSync(configPath, "utf-8");
    const config = JSON.parse(configJson);
    expect(config.paths).toEqual(paths);
    expect(config.deeplink).toBe(deeplink);
    expect(config.port).toBe(WATCHER_PORT);
    expect(config.dirtyPath).toBe(
      join(supportPath, NOW_WATCHER_DIRTY_FILENAME),
    );
  });
});
