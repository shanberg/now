/**
 * Resolves the focus file path without loading cliffy.
 * Used by json/init (slim path) and by unixCLI; interactive branch dynamic-imports cliUtils.
 */
import { NOW_FILE_SUFFIX } from "../consts.ts";
import { resolve } from "std/path/mod.ts";

/** Returns the first focus file (.*.now.md) in cwd, or null. Never prompts. */
export function findFocusFileInCwd(): string | null {
  const files = [...Deno.readDirSync(".")].filter(
    (file) => file.isFile && file.name.endsWith(NOW_FILE_SUFFIX),
  );
  return files.length > 0 ? files[0].name : null;
}

const NO_FOCUS_FILE_MESSAGE =
  "No focus file found and NOW_FILE not set. Set NOW_FILE to your focus file path (e.g. export NOW_FILE=$HOME/.now/focus.now.md) or run from a directory with a .now.md file. To create a file: NOW_FILE=/path/to/file.now.md now init";

/**
 * Resolves the focus file path: NOW_FILE env, or file in cwd, or (if interactive) prompt.
 * Always returns absolute path. When interactive is true, dynamic-imports cliUtils for findOrCreateFocusFile.
 */
export async function resolveFocusFilePath(
  options: { interactive?: boolean } = {},
): Promise<string> {
  const { interactive = true } = options;
  const fromEnv = Deno.env.get("NOW_FILE");
  if (fromEnv) return resolve(Deno.cwd(), fromEnv);
  const inCwd = findFocusFileInCwd();
  if (inCwd) return resolve(Deno.cwd(), inCwd);
  if (interactive) {
    const { findOrCreateFocusFile } = await import("./cliUtils.ts");
    const fileName = await findOrCreateFocusFile();
    return resolve(Deno.cwd(), fileName);
  }
  throw new Error(NO_FOCUS_FILE_MESSAGE);
}
