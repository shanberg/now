import { exec, execFile } from "child_process";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { basename, dirname, resolve } from "path";
import { promisify } from "util";
import {
  type JsonFocus,
  type JsonItem,
  parseFocusFileContent,
} from "now-format";

export type { JsonFocus, JsonItem };

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

/** Default PATH when process.env.PATH is empty. Tried first to avoid slow login shell. */
const DEFAULT_PATH = "/usr/local/bin:/usr/bin:/bin";

/** Cached env with PATH from login shell when process.env.PATH is empty (e.g. under Raycast). */
let envWithPathPromise: Promise<NodeJS.ProcessEnv> | null = null;

/**
 * Returns process.env, or env with PATH from the user's login shell when PATH is empty.
 * Only used when `now` is not found with DEFAULT_PATH (avoids slow shell on cold start).
 */
async function getEnvForSubprocess(): Promise<NodeJS.ProcessEnv> {
  if (envWithPathPromise !== null) return envWithPathPromise;
  envWithPathPromise = (async () => {
    const path = process.env.PATH;
    if (path && path.length > 0) return { ...process.env };
    const shell = process.env.SHELL || "/bin/zsh";
    try {
      const { stdout } = await execFileAsync(shell, ["-l", "-c", "echo $PATH"], {
        encoding: "utf-8",
        timeout: 5000,
        env: {
          HOME: process.env.HOME ?? "",
          USER: process.env.USER ?? "",
          PATH: "/usr/bin:/bin",
        },
      });
      return { ...process.env, PATH: stdout.trim() };
    } catch {
      return { ...process.env };
    }
  })();
  return envWithPathPromise;
}

/** GitHub repo with install instructions. */
export const NOW_INSTALL_URL = "https://github.com/shanberg/now#installation";

/** URL to update One Thing menu bar app with the given focus text (one-thing:?text=…). */
export function getOneThingUrl(focusText: string): string {
  return `one-thing:?text=${encodeURIComponent(focusText)}`;
}

/** Install script URL (run in Terminal so sudo works). */
const NOW_INSTALL_SCRIPT_URL =
  "https://raw.githubusercontent.com/shanberg/now/main/dist/install.sh";

const DEBUG_LOG =
  "http://127.0.0.1:7253/ingest/fbc7b931-fa3f-4555-b420-453391a24b98";
function debugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId?: string,
) {
  fetch(DEBUG_LOG, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location,
      message,
      data,
      hypothesisId,
      timestamp: Date.now(),
      sessionId: "raycast-now",
    }),
  }).catch(() => { });
}

/** LocalStorage key: when "true", always use the global (default) Now file. */
export const NOW_USE_GLOBAL_KEY = "nowUseGlobal";
/** LocalStorage key: JSON object of app bundleId/name → path for app-specific files (merged with preference). */
export const NOW_APP_PATHS_KEY = "nowAppPaths";
/** LocalStorage key: JSON object of document path → now file path for document-specific files. */
export const NOW_DOCUMENT_PATHS_KEY = "nowDocumentPaths";
/** LocalStorage key: last resolved now file path (used when app/document resolution fails so we don't flip to Global). */
export const NOW_LAST_RESOLVED_PATH_KEY = "nowLastResolvedPath";

/**
 * Returns the path of the frontmost application's current document, or null if not available.
 * Uses AppleScript; only works with scriptable apps that expose a document path.
 */
export async function getCurrentDocumentPath(): Promise<string | null> {
  const script = `
    tell application "System Events"
      set appName to name of first process whose frontmost is true
    end tell
    try
      tell application appName
        set docPath to path of document 1
      end tell
      if docPath is not missing value then
        return docPath
      end if
    end try
    return ""
  `;
  try {
    const { stdout } = await execAsync(`osascript -e ${JSON.stringify(script)}`, {
      encoding: "utf-8",
      timeout: 3000,
    });
    const raw = stdout.trim();
    if (!raw) return null;
    let path = raw;
    if (path.startsWith("file://")) {
      path = decodeURIComponent(path.slice(7));
    }
    if (path.includes(":")) {
      path = path.replace(/:/g, "/");
      if (path.startsWith("/")) path = path.slice(1);
      path = "/" + path;
    }
    return path || null;
  } catch {
    return null;
  }
}

/**
 * Resolves which Now file path to use for a document path and optional JSON mapping.
 * mappingJson format: { "documentPath": "nowFilePath", ... }. Keys are exact document paths.
 */
export function resolveNowFilePathForDocument(
  defaultPath: string,
  mappingJson: string | undefined,
  documentPath: string,
): string {
  if (!mappingJson?.trim() || !documentPath) return resolveNowFilePath(defaultPath);
  let map: Record<string, string>;
  try {
    map = JSON.parse(mappingJson) as Record<string, string>;
  } catch {
    return resolveNowFilePath(defaultPath);
  }
  const raw = map[documentPath];
  if (!raw) return resolveNowFilePath(defaultPath);
  return resolveNowFilePath(raw);
}

/**
 * Suggested Now file path for a document: ~/.now/<SanitizedBasename>.now.md
 */
export function suggestedNowPathForDocument(docPath: string): string {
  const base = basename(docPath);
  const name = (base.endsWith(".md") ? base.slice(0, -3) : base) || "document";
  const sanitized = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `~/.now/${sanitized}.now.md`;
}

/**
 * Resolves which Now file path to use given the frontmost app and an optional JSON mapping.
 * mappingJson format: { "bundleId_or_app_name": "path", ... } e.g. {"com.googlecode.iterm2": "~/.now/term.now.md"}.
 * Keys are matched against app.bundleId then app.name; values are paths (passed through resolveNowFilePath).
 * Returns defaultPath (resolved) if mapping is empty/invalid or no key matches.
 */
export function resolveNowFilePathForApp(
  defaultPath: string,
  mappingJson: string | undefined,
  app: { bundleId?: string; name: string },
): string {
  if (!mappingJson?.trim()) return resolveNowFilePath(defaultPath);
  let map: Record<string, string>;
  try {
    map = JSON.parse(mappingJson) as Record<string, string>;
  } catch {
    return resolveNowFilePath(defaultPath);
  }
  const key =
    (app.bundleId && map[app.bundleId] !== undefined && app.bundleId) ||
    (app.name && map[app.name] !== undefined && app.name) ||
    null;
  const raw = key ? map[key] : defaultPath;
  return resolveNowFilePath(raw);
}

/**
 * Suggested Now file path for an app: ~/.now/<SanitizedName>.now.md
 */
export function suggestedNowPathForApp(app: { name: string }): string {
  const sanitized = app.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const name = sanitized || "app";
  return `~/.now/${name}.now.md`;
}

/**
 * Returns the focus file path as absolute so NOW_FILE and the CLI resolve to the same file.
 * Expands ~ to HOME, then resolves relative paths against process.cwd().
 */
export function resolveNowFilePath(rawPath: string): string {
  // #region agent log
  const home = process.env.HOME ?? "";
  const expanded = rawPath.replace(/^~(?=\/|$)/, home);
  const resolvedPath = resolve(expanded);
  debugLog(
    "now.ts:resolveNowFilePath",
    "path resolved",
    {
      rawPath,
      expanded,
      resolvedPath,
      HOME: home,
      processCwd: process.cwd(),
    },
    "H1,H4",
  );
  // #endregion
  return resolvedPath;
}

/**
 * Returns true if a file exists at the given path.
 */
export function focusFileExists(nowFilePath: string): boolean {
  return existsSync(nowFilePath);
}

/**
 * Creates the focus file at the given path if missing (via CLI `now init`).
 * Uses the same env/PATH as other now commands. Throws on error.
 */
export async function createFocusFile(nowFilePath: string): Promise<void> {
  await runNow(nowFilePath, "init");
}

/**
 * Opens Terminal.app and runs the now install script (curl | bash).
 * The script may prompt for sudo. Resolves when Terminal has been opened.
 */
export async function runNowInstallInTerminal(): Promise<void> {
  const cmd = `curl -fsSL ${NOW_INSTALL_SCRIPT_URL} | bash`;
  const scriptArg = cmd.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const doScript = `tell application "Terminal" to do script "${scriptArg}"`;
  await execAsync(
    `osascript -e 'tell application "Terminal" to activate' -e ${JSON.stringify(doScript)}`,
  );
}

/**
 * Opens Terminal.app and runs `NOW_FILE=<path> now status` so the user can see the CLI output/error.
 * Use when the extension can't read the focus file (e.g. PATH differs from Terminal).
 */
export async function openTerminalWithNowStatus(
  nowFilePath: string,
): Promise<void> {
  const escaped = nowFilePath.replace(/'/g, "'\\''");
  const cmd = `export NOW_FILE='${escaped}' && now status`;
  const scriptArg = cmd.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const doScript = `tell application "Terminal" to do script "${scriptArg}"`;
  await execAsync(
    `osascript -e 'tell application "Terminal" to activate' -e ${JSON.stringify(doScript)}`,
  );
}

/**
 * Opens Terminal.app and runs `NOW_FILE=<path> now tui` to start the interactive TUI.
 */
export async function openTerminalWithNowTui(
  nowFilePath: string,
): Promise<void> {
  const escaped = nowFilePath.replace(/'/g, "'\\''");
  const cmd = `export NOW_FILE='${escaped}' && now tui`;
  const scriptArg = cmd.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const doScript = `tell application "Terminal" to do script "${scriptArg}"`;
  await execAsync(
    `osascript -e 'tell application "Terminal" to activate' -e ${JSON.stringify(doScript)}`,
  );
}

/**
 * Returns true if the now CLI is on PATH. Tries default PATH first to avoid slow shell spawn.
 */
export async function isNowOnPath(): Promise<boolean> {
  const tryWithEnv = async (env: NodeJS.ProcessEnv): Promise<boolean> => {
    try {
      await execFileAsync("now", [], {
        encoding: "utf-8",
        timeout: 2000,
        env,
      });
      return true;
    } catch (err: unknown) {
      const e = err as NodeJS.ErrnoException;
      if (e?.code === "ENOENT") return false;
      return true; // other error means now exists but failed (e.g. exit 1)
    }
  };
  if (await tryWithEnv(process.env.PATH ? process.env : { ...process.env, PATH: DEFAULT_PATH }))
    return true;
  const envWithPath = await getEnvForSubprocess();
  return tryWithEnv(envWithPath);
}

/**
 * Runs `now` with NOW_FILE set. Returns { stdout, stderr } or throws on non-zero exit.
 * Tries default PATH first to avoid slow login shell; only calls getEnvForSubprocess on ENOENT.
 */
export async function runNow(
  nowFilePath: string,
  ...args: string[]
): Promise<{ stdout: string; stderr: string }> {
  const cwdDir = dirname(nowFilePath);
  const cwd = existsSync(cwdDir) ? cwdDir : undefined;
  const baseEnv =
    process.env.PATH && process.env.PATH.length > 0
      ? { ...process.env }
      : { ...process.env, PATH: DEFAULT_PATH };

  const run = (env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> =>
    new Promise((resolve, reject) => {
      execFile(
        "now",
        args,
        {
          encoding: "utf-8",
          env: { ...env, NOW_FILE: nowFilePath },
          maxBuffer: 1024 * 1024,
          ...(cwd !== undefined && { cwd }),
        },
        (err, stdout, stderr) => {
          if (err) {
            const code = (err as NodeJS.ErrnoException).code;
            if (code === "ENOENT") {
              reject(err);
              return;
            }
            const msg =
              ((stderr ?? "").trim() || (err as NodeJS.ErrnoException).message) ??
              "now failed";
            reject(new Error(msg));
            return;
          }
          resolve({ stdout: stdout ?? "", stderr: stderr ?? "" });
        },
      );
    });

  try {
    return await run(baseEnv);
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e?.code === "ENOENT") {
      const envWithPath = await getEnvForSubprocess();
      return run(envWithPath);
    }
    throw err;
  }
}

export type GetJsonFocusResult = { data: JsonFocus | null; error?: string };
export type GetJsonItemsResult = { data: JsonItem[] | null; error?: string };

/**
 * Returns current focus (read from file when possible; otherwise via CLI).
 * Reading the file in the extension avoids subprocess spawn for fast cold start and resume.
 */
export async function getJsonFocus(
  nowFilePath: string,
): Promise<GetJsonFocusResult> {
  try {
    const content = await readFile(nowFilePath, "utf-8");
    const { focus } = parseFocusFileContent(content);
    return { data: focus };
  } catch {
    try {
      const { stdout } = await runNow(nowFilePath, "json", "focus");
      return { data: JSON.parse(stdout.trim()) as JsonFocus };
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      return { data: null, error: errMsg };
    }
  }
}

/**
 * Returns focusable items (read from file when possible; otherwise via CLI).
 * Reading the file in the extension avoids subprocess spawn for fast cold start and resume.
 */
export async function getJsonItems(
  nowFilePath: string,
): Promise<GetJsonItemsResult> {
  try {
    const content = await readFile(nowFilePath, "utf-8");
    const { items } = parseFocusFileContent(content);
    return { data: items };
  } catch {
    try {
      const { stdout } = await runNow(nowFilePath, "json", "items");
      return { data: JSON.parse(stdout.trim()) as JsonItem[] };
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      return { data: null, error: errMsg };
    }
  }
}

/**
 * Runs `now switch <key>`. Throws on error.
 */
export async function runSwitch(
  nowFilePath: string,
  key: string,
): Promise<void> {
  await runNow(nowFilePath, "switch", key);
}

/**
 * Runs `now complete`. Throws on error.
 */
export async function runComplete(nowFilePath: string): Promise<void> {
  await runNow(nowFilePath, "complete");
}

/**
 * Runs `now add <items>`. Throws on error.
 */
export async function runAdd(
  nowFilePath: string,
  items: string,
): Promise<void> {
  await runNow(nowFilePath, "add", items);
}

/**
 * Runs `now later <items>`. Throws on error.
 */
export async function runLater(
  nowFilePath: string,
  items: string,
): Promise<void> {
  await runNow(nowFilePath, "later", items);
}

/**
 * Runs `now edit <newName>`. Throws on error.
 */
export async function runEdit(
  nowFilePath: string,
  newName: string,
): Promise<void> {
  await runNow(nowFilePath, "edit", newName);
}

/**
 * Runs `now wrap <parentName>`. Throws on error.
 */
export async function runWrap(
  nowFilePath: string,
  parentName: string,
): Promise<void> {
  await runNow(nowFilePath, "wrap", parentName);
}

/**
 * Runs `now move <targetKey>`. Throws on error.
 */
export async function runMove(
  nowFilePath: string,
  targetKey: string,
): Promise<void> {
  await runNow(nowFilePath, "move", targetKey);
}

/**
 * Runs `now dive-in`. Throws on error.
 */
export async function runDiveIn(nowFilePath: string): Promise<void> {
  await runNow(nowFilePath, "dive-in");
}

/**
 * Runs `now next`. Throws on error.
 */
export async function runNext(nowFilePath: string): Promise<void> {
  await runNow(nowFilePath, "next");
}

/**
 * Runs `now previous`. Throws on error.
 */
export async function runPrevious(nowFilePath: string): Promise<void> {
  await runNow(nowFilePath, "previous");
}

/**
 * Runs `now down`. Throws on error.
 */
export async function runDown(nowFilePath: string): Promise<void> {
  await runNow(nowFilePath, "down");
}

/**
 * Runs `now up`. Throws on error.
 */
export async function runUp(nowFilePath: string): Promise<void> {
  await runNow(nowFilePath, "up");
}
