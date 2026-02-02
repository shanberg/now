import { ensureFile } from "https://deno.land/std@0.224.0/fs/mod.ts";
import { dirname } from "std/path/mod.ts";
import { getInitialFocusContent, LOG_FILE_PATH } from "../consts.ts";

/** Reads file at path; returns "" if not found, otherwise throws. */
async function readFileOrEmpty(path: string): Promise<string> {
  try {
    return await Deno.readTextFile(path);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return "";
    throw error;
  }
}

/**
 * Reads the content of a markdown file.
 * @param {string} path - The path to the markdown file.
 * @returns {Promise<string>} The content of the markdown file.
 */
export async function readMarkdownFile(path: string): Promise<string> {
  if (!path) throw new Error("Path is required");
  return readFileOrEmpty(path);
}

/**
 * Writes content to a markdown file.
 * @param {string} content - The content to write to the file.
 * @param {string} path - The path to the markdown file.
 */
export async function writeMarkdownFile(
  content: string,
  path: string,
): Promise<void> {
  try {
    await Deno.writeTextFile(path, content);
  } catch (error) {
    console.error("Error writing file:", error);
  }
}

/**
 * Creates the focus file at path with initial content if it does not exist.
 * Ensures parent directory exists. Idempotent when file already exists.
 * @param {string} path - Absolute path to the focus file.
 * @param {string} [rootName] - Optional root focus label (app/document name); empty/whitespace → "Root Focus".
 */
export async function ensureFocusFile(
  path: string,
  rootName?: string,
): Promise<void> {
  try {
    await Deno.readTextFile(path);
    return;
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }
  await Deno.mkdir(dirname(path), { recursive: true });
  await Deno.writeTextFile(path, getInitialFocusContent(rootName));
}

/**
 * Logs an action to the log file.
 * @param {string} action - The action performed.
 * @param {string} details - Additional details about the action.
 */
export async function logAction(
  action: string,
  details: string,
): Promise<void> {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${action}: ${details}\n`;

  // Ensure the log file exists
  await ensureFile(LOG_FILE_PATH);

  // Append the log entry to the log file
  await Deno.writeTextFile(LOG_FILE_PATH, logEntry, { append: true });
}
