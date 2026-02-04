/**
 * Path resolution for Now file paths (~ expansion, resolve). No dependency on CLI or storage.
 */
import { resolve } from "path";

/**
 * Expands leading ~ to HOME and resolves to an absolute path.
 */
export function resolveNowFilePath(rawPath: string): string {
  const home = process.env.HOME ?? "";
  const expanded = rawPath.replace(/^~(?=\/|$)/, home);
  return resolve(expanded);
}
