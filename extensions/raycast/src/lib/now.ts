import { exec, execFile } from "child_process";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { dirname, resolve } from "path";
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
