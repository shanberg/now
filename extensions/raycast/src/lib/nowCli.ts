/**
 * Now CLI execution: runNow, env/PATH, getJson*, mutation commands (runSwitch, runComplete, etc.).
 */
import { execFile } from "child_process";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { dirname } from "path";
import { promisify } from "util";
import {
  type JsonFocus,
  type JsonItem,
  parseFocusFileContent,
} from "now-format";

const execFileAsync = promisify(execFile);

/** Result of a mutation when CLI returns --emit-json. */
export type MutationResult = { focus: JsonFocus; items: JsonItem[] };

function parseMutationStdout(trimmed: string): MutationResult | null {
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed) as {
      focus?: JsonFocus;
      items?: JsonItem[];
    };
    if (parsed?.focus == null || !Array.isArray(parsed.items)) return null;
    return { focus: parsed.focus, items: parsed.items };
  } catch {
    return null;
  }
}

async function runNowMutation(
  nowFilePath: string,
  command: string,
  ...args: string[]
): Promise<MutationResult | null> {
  try {
    const { stdout } = await runNow(
      nowFilePath,
      command,
      ...args,
      "--emit-json",
    );
    return parseMutationStdout(stdout.trim());
  } catch {
    return null;
  }
}

const DEFAULT_PATH = "/usr/local/bin:/usr/bin:/bin";
let envWithPathPromise: Promise<NodeJS.ProcessEnv> | null = null;

async function loadEnvWithPathFromShell(): Promise<NodeJS.ProcessEnv> {
  const envPath = process.env.PATH;
  if (envPath && envPath.length > 0) return { ...process.env };
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
}

async function getEnvForSubprocess(): Promise<NodeJS.ProcessEnv> {
  if (envWithPathPromise !== null) return envWithPathPromise;
  envWithPathPromise = loadEnvWithPathFromShell();
  return envWithPathPromise;
}

function execNowWithEnv(
  nowFilePath: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  cwd: string | undefined,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
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
}

/**
 * Runs `now` with NOW_FILE set. Returns { stdout, stderr } or throws on non-zero exit.
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

  try {
    return await execNowWithEnv(nowFilePath, args, baseEnv, cwd);
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e?.code === "ENOENT") {
      const envWithPath = await getEnvForSubprocess();
      return execNowWithEnv(nowFilePath, args, envWithPath, cwd);
    }
    throw err;
  }
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
      return true;
    }
  };
  if (
    await tryWithEnv(
      process.env.PATH ? process.env : { ...process.env, PATH: DEFAULT_PATH },
    )
  )
    return true;
  const envWithPath = await getEnvForSubprocess();
  return tryWithEnv(envWithPath);
}

/**
 * Returns markdown preview of the tree after moving the current item under the given target key.
 */
export async function getPreviewMarkdownForMove(
  nowFilePath: string,
  moveTargetKey: string,
): Promise<string> {
  try {
    const { stdout } = await runNow(
      nowFilePath,
      "json",
      "preview",
      "--move-target",
      moveTargetKey,
    );
    return stdout.trim();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return `Failed to load preview.\n\n${msg}`;
  }
}

export type GetJsonFocusResult = { data: JsonFocus | null; error?: string };
export type GetJsonItemsResult = { data: JsonItem[] | null; error?: string };

async function runJsonSubcommand<T>(
  nowFilePath: string,
  subcommand: string,
  parseStdout: (stdout: string) => T,
): Promise<{ data: T | null; error?: string }> {
  try {
    const { stdout } = await runNow(nowFilePath, "json", subcommand);
    return { data: parseStdout(stdout.trim()) };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function readFromFileOrRunJson<T>(
  nowFilePath: string,
  subcommand: string,
  fromFile: (content: string) => T,
  parseStdout: (stdout: string) => T,
): Promise<{ data: T | null; error?: string }> {
  try {
    const content = await readFile(nowFilePath, "utf-8");
    return { data: fromFile(content) };
  } catch {
    return runJsonSubcommand(nowFilePath, subcommand, parseStdout);
  }
}

export async function getJsonFocus(
  nowFilePath: string,
): Promise<GetJsonFocusResult> {
  return readFromFileOrRunJson(
    nowFilePath,
    "focus",
    (content) => parseFocusFileContent(content).focus,
    (stdout) => JSON.parse(stdout) as JsonFocus,
  );
}

export async function getJsonItems(
  nowFilePath: string,
): Promise<GetJsonItemsResult> {
  return readFromFileOrRunJson(
    nowFilePath,
    "items",
    (content) => parseFocusFileContent(content).items,
    (stdout) => JSON.parse(stdout) as JsonItem[],
  );
}

export async function runSwitch(
  nowFilePath: string,
  key: string,
): Promise<MutationResult | null> {
  return runNowMutation(nowFilePath, "switch", key);
}

export async function runComplete(
  nowFilePath: string,
): Promise<MutationResult | null> {
  return runNowMutation(nowFilePath, "complete");
}

export async function runAdd(
  nowFilePath: string,
  items: string,
): Promise<MutationResult | null> {
  return runNowMutation(nowFilePath, "add", items);
}

export async function runLater(
  nowFilePath: string,
  items: string,
): Promise<MutationResult | null> {
  return runNowMutation(nowFilePath, "later", items);
}

export async function runEdit(
  nowFilePath: string,
  newName: string,
): Promise<MutationResult | null> {
  return runNowMutation(nowFilePath, "edit", newName);
}

export async function runWrap(
  nowFilePath: string,
  parentName: string,
): Promise<MutationResult | null> {
  return runNowMutation(nowFilePath, "wrap", parentName);
}

export async function runMove(
  nowFilePath: string,
  targetKey: string,
): Promise<MutationResult | null> {
  return runNowMutation(nowFilePath, "move", targetKey);
}

export async function runDiveIn(nowFilePath: string): Promise<void> {
  await runNow(nowFilePath, "dive-in");
}

export async function runNext(nowFilePath: string): Promise<void> {
  await runNow(nowFilePath, "next");
}

export async function runPrevious(nowFilePath: string): Promise<void> {
  await runNow(nowFilePath, "previous");
}

export async function runDown(nowFilePath: string): Promise<void> {
  await runNow(nowFilePath, "down");
}

export async function runUp(nowFilePath: string): Promise<void> {
  await runNow(nowFilePath, "up");
}
