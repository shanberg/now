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

/** Result of a mutation when CLI returns --emit-json. */
export type MutationResult = { focus: JsonFocus; items: JsonItem[] };

async function runNowMutation(
  nowFilePath: string,
  command: string,
  ...args: string[]
): Promise<MutationResult | null> {
  try {
    const { stdout } = await runNow(nowFilePath, command, ...args, "--emit-json");
    const trimmed = stdout.trim();
    if (!trimmed) return null;
    const parsed = JSON.parse(trimmed) as { focus: JsonFocus; items: JsonItem[] };
    if (parsed?.focus == null || !Array.isArray(parsed.items)) return null;
    return { focus: parsed.focus, items: parsed.items };
  } catch {
    return null;
  }
}

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

/** LocalStorage key: when "true", always use the global (default) Now file. */
export const NOW_USE_GLOBAL_KEY = "nowUseGlobal";
/** LocalStorage key: JSON object of app bundleId/name → path for app-specific files (merged with preference). */
export const NOW_APP_PATHS_KEY = "nowAppPaths";
/** LocalStorage key: JSON object of document path → now file path for document-specific files. */
export const NOW_DOCUMENT_PATHS_KEY = "nowDocumentPaths";
/** LocalStorage key: last resolved now file path (used when app/document resolution fails so we don't flip to Global). */
export const NOW_LAST_RESOLVED_PATH_KEY = "nowLastResolvedPath";

export function parseJsonToRecord(json: string | undefined): Record<string, string> {
  if (!json?.trim()) return {};
  try {
    const map = JSON.parse(json) as Record<string, string>;
    return map != null && typeof map === "object" ? map : {};
  } catch {
    return {};
  }
}

/**
 * Path similarity for directory paths: number of leading path segments that match.
 * Higher = closer (same project root). Used when matching by filename and picking closest path.
 */
export function pathSimilarity(dirA: string, dirB: string): number {
  const a = resolve(dirA).split("/").filter(Boolean);
  const b = resolve(dirB).split("/").filter(Boolean);
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

/**
 * Filename similarity: 0–1 score from Levenshtein distance (1 = identical).
 * Used when matching by path and picking closest filename.
 */
export function filenameSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const maxLen = Math.max(a.length, b.length);
  const dist = levenshtein(a, b);
  return 1 - dist / maxLen;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost,
      );
    }
  }
  return d[m][n];
}

/**
 * Merges preference app paths with LocalStorage app paths (local overrides prefs for same key).
 * Returns a JSON string suitable for resolveNowFilePathForApp / getAppPathForCurrentApp.
 */
export function mergeAppPathsJson(
  prefsJson: string | undefined,
  localJson: string | undefined,
): string {
  const prefs = parseJsonToRecord(prefsJson?.trim() || undefined);
  const local = parseJsonToRecord(localJson ?? undefined);
  return JSON.stringify({ ...prefs, ...local });
}

function getAppMapKey(
  map: Record<string, string>,
  app: { bundleId?: string; name: string },
): string | null {
  if (app.bundleId != null && map[app.bundleId] !== undefined) return app.bundleId;
  if (app.name && map[app.name] !== undefined) return app.name;
  return null;
}

/**
 * Returns the resolved Now file path for the given app if it exists in the merged app map, else null.
 * Use for "app path for current" sidebar/labels; for the path to use, call resolveNowFilePathForApp.
 */
export function getAppPathForCurrentApp(
  mergedAppJson: string,
  app: { bundleId?: string; name: string } | null,
): string | null {
  if (!app) return null;
  const map = parseJsonToRecord(mergedAppJson);
  const key = getAppMapKey(map, app);
  return key ? resolveNowFilePath(map[key]) : null;
}

function findExactMatch(
  map: Record<string, string>,
  normalizedDocPath: string,
): string | null {
  for (const [storedDocPath, nowFilePath] of Object.entries(map)) {
    if (resolve(storedDocPath) === normalizedDocPath)
      return resolveNowFilePath(nowFilePath);
  }
  return null;
}

function pickBestByPathSimilarity(
  candidates: [string, string][],
  currentDir: string,
): string | null {
  if (candidates.length === 0) return null;
  let best = candidates[0];
  let bestScore = pathSimilarity(dirname(best[0]), currentDir);
  for (let i = 1; i < candidates.length; i++) {
    const [storedDocPath, nowFilePath] = candidates[i];
    const score = pathSimilarity(dirname(storedDocPath), currentDir);
    if (score > bestScore || (score === bestScore && storedDocPath < best[0])) {
      best = [storedDocPath, nowFilePath];
      bestScore = score;
    }
  }
  return resolveNowFilePath(best[1]);
}

function pickBestByFilenameSimilarity(
  candidates: [string, string][],
  currentBase: string,
): string | null {
  if (candidates.length === 0) return null;
  let best = candidates[0];
  let bestScore = filenameSimilarity(basename(best[0]), currentBase);
  for (let i = 1; i < candidates.length; i++) {
    const [storedDocPath, nowFilePath] = candidates[i];
    const score = filenameSimilarity(basename(storedDocPath), currentBase);
    if (score > bestScore || (score === bestScore && storedDocPath < best[0])) {
      best = [storedDocPath, nowFilePath];
      bestScore = score;
    }
  }
  return resolveNowFilePath(best[1]);
}

/**
 * Returns the resolved Now file path for the current document if it exists in the document map, else null.
 * Resolution order: exact match (normalized path) → by filename (closest path) → by path (closest filename).
 * Tiebreaker when similarity is equal: lexicographically smallest stored document path.
 */
export function getDocPathForCurrentDocument(
  documentPathsJson: string | undefined,
  documentPath: string | null,
): string | null {
  if (!documentPath?.trim() || !documentPathsJson?.trim()) return null;
  const map = parseJsonToRecord(documentPathsJson);
  const normalizedDocPath = resolve(documentPath);
  const currentBase = basename(normalizedDocPath);
  const currentDir = dirname(normalizedDocPath);

  const exact = findExactMatch(map, normalizedDocPath);
  if (exact !== null) return exact;

  if (currentBase === "") return null;

  const sameFilenameCandidates: [string, string][] = [];
  const samePathCandidates: [string, string][] = [];
  for (const [storedDocPath, nowFilePath] of Object.entries(map)) {
    const storedNormalized = resolve(storedDocPath);
    const storedBase = basename(storedNormalized);
    const storedDir = dirname(storedNormalized);
    if (storedBase === currentBase) sameFilenameCandidates.push([storedDocPath, nowFilePath]);
    if (storedDir === currentDir) samePathCandidates.push([storedDocPath, nowFilePath]);
  }

  if (sameFilenameCandidates.length > 0)
    return pickBestByPathSimilarity(sameFilenameCandidates, currentDir);
  if (samePathCandidates.length > 0)
    return pickBestByFilenameSimilarity(samePathCandidates, currentBase);

  return null;
}

export type ResolveNowPathResult = {
  path: string;
  sourceLabel: string;
  appPathForCurrent: string | null;
  docPathForCurrent: string | null;
};

/**
 * Single place for base + app + document resolution. Order: useGlobal → document (if mapped) → app → last used → default.
 * Callers: read storage, merge app paths, get document + app, call this, then set state and persist lastResolvedPath when path came from app or document.
 */
export function resolveNowPathFromContext(options: {
  defaultPath: string;
  useGlobal: boolean;
  mergedAppJson: string;
  app: { bundleId?: string; name: string } | null;
  lastResolvedPath: string | null;
  documentPath?: string | null;
  documentPathsJson?: string;
}): ResolveNowPathResult {
  const {
    defaultPath,
    useGlobal,
    mergedAppJson,
    app,
    lastResolvedPath,
    documentPath = null,
    documentPathsJson,
  } = options;

  const docPathForCurrent = getDocPathForCurrentDocument(
    documentPathsJson,
    documentPath ?? null,
  );

  if (useGlobal) {
    return {
      path: defaultPath,
      sourceLabel: "Global",
      appPathForCurrent: getAppPathForCurrentApp(mergedAppJson, app),
      docPathForCurrent,
    };
  }

  if (docPathForCurrent) {
    return {
      path: docPathForCurrent,
      sourceLabel: `Document — ${documentPath ?? "document"}`,
      appPathForCurrent: getAppPathForCurrentApp(mergedAppJson, app),
      docPathForCurrent,
    };
  }

  if (app) {
    const path = resolveNowFilePathForApp(defaultPath, mergedAppJson, app);
    return {
      path,
      sourceLabel:
        path !== defaultPath ? `${app.name} — ${path}` : "Global",
      appPathForCurrent: getAppPathForCurrentApp(mergedAppJson, app),
      docPathForCurrent,
    };
  }

  if (lastResolvedPath) {
    return {
      path: lastResolvedPath,
      sourceLabel: `Last used — ${lastResolvedPath}`,
      appPathForCurrent: null,
      docPathForCurrent,
    };
  }

  return {
    path: defaultPath,
    sourceLabel: "Global",
    appPathForCurrent: getAppPathForCurrentApp(mergedAppJson, app),
    docPathForCurrent,
  };
}

function normalizeAppleScriptPath(raw: string): string {
  let path = raw;
  if (path.startsWith("file://")) {
    path = decodeURIComponent(path.slice(7));
  }
  if (path.includes(":")) {
    path = path.replace(/:/g, "/");
    if (path.startsWith("/")) path = path.slice(1);
    path = "/" + path;
  }
  return path;
}

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
    const path = normalizeAppleScriptPath(raw);
    return path || null;
  } catch {
    return null;
  }
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
 * Display name for a document path (e.g. for action titles). Returns basename or "document" if empty.
 */
export function documentDisplayName(docPath: string): string {
  return basename(docPath) || "document";
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
  const key = getAppMapKey(map, app);
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
  const home = process.env.HOME ?? "";
  const expanded = rawPath.replace(/^~(?=\/|$)/, home);
  return resolve(expanded);
}

/**
 * Returns true if a file exists at the given path.
 */
export function focusFileExists(nowFilePath: string): boolean {
  return existsSync(nowFilePath);
}

/**
 * Creates the focus file at the given path if missing (via CLI `now init`).
 * Optional rootName (app/document name) sets the root focus label; empty/whitespace omitted.
 * Uses the same env/PATH as other now commands. Throws on error.
 */
export async function createFocusFile(
  nowFilePath: string,
  rootName?: string,
): Promise<void> {
  await runNow(
    nowFilePath,
    "init",
    ...(rootName?.trim() ? [rootName.trim()] : []),
  );
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

/**
 * Returns markdown preview of the tree after moving the current item under the given target key.
 * Calls `now json preview --move-target <key>`. Returns error message string on failure.
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
 * Runs `now switch <key>`. Returns new state when CLI supports --emit-json, else null.
 */
export async function runSwitch(
  nowFilePath: string,
  key: string,
): Promise<MutationResult | null> {
  return runNowMutation(nowFilePath, "switch", key);
}

/**
 * Runs `now complete`. Returns new state when CLI supports --emit-json, else null.
 */
export async function runComplete(
  nowFilePath: string,
): Promise<MutationResult | null> {
  return runNowMutation(nowFilePath, "complete");
}

/**
 * Runs `now add <items>`. Returns new state when CLI supports --emit-json, else null.
 */
export async function runAdd(
  nowFilePath: string,
  items: string,
): Promise<MutationResult | null> {
  return runNowMutation(nowFilePath, "add", items);
}

/**
 * Runs `now later <items>`. Returns new state when CLI supports --emit-json, else null.
 */
export async function runLater(
  nowFilePath: string,
  items: string,
): Promise<MutationResult | null> {
  return runNowMutation(nowFilePath, "later", items);
}

/**
 * Runs `now edit <newName>`. Returns new state when CLI supports --emit-json, else null.
 */
export async function runEdit(
  nowFilePath: string,
  newName: string,
): Promise<MutationResult | null> {
  return runNowMutation(nowFilePath, "edit", newName);
}

/**
 * Runs `now wrap <parentName>`. Returns new state when CLI supports --emit-json, else null.
 */
export async function runWrap(
  nowFilePath: string,
  parentName: string,
): Promise<MutationResult | null> {
  return runNowMutation(nowFilePath, "wrap", parentName);
}

/**
 * Runs `now move <targetKey>`. Returns new state when CLI supports --emit-json, else null.
 */
export async function runMove(
  nowFilePath: string,
  targetKey: string,
): Promise<MutationResult | null> {
  return runNowMutation(nowFilePath, "move", targetKey);
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
