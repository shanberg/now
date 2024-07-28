import { ensureFile } from "https://deno.land/std@0.224.0/fs/mod.ts";
import { LOG_FILE_PATH } from "../consts.ts";

/**
 * Reads the content of a markdown file.
 * @param {string} path - The path to the markdown file.
 * @returns {Promise<string>} The content of the markdown file.
 */
export async function readMarkdownFile(path: string): Promise<string> {
  if (!path) {
    throw new Error("Path is required");
  }
  try {
    return await Deno.readTextFile(path);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.log("File not found.");
      return "";
    } else {
      console.error("Error reading file:", error);
      return "";
    }
  }
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
