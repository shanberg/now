/**
 * JSON parsing for path maps (app paths). No dependency on now CLI or storage.
 */

function isJsonObjectOrArrayStart(s: string): boolean {
  return s.length > 0 && (s[0] === "{" || s[0] === "[");
}

function parseToRecordOrEmpty(trimmed: string): Record<string, string> {
  try {
    const map = JSON.parse(trimmed) as Record<string, string>;
    return map != null && typeof map === "object" ? map : {};
  } catch {
    return {};
  }
}

/**
 * Parses a JSON string into a record of string → string. Returns {} for null, non-string, empty, or invalid JSON.
 */
export function parseJsonToRecord(
  json: string | undefined,
): Record<string, string> {
  if (json == null || typeof json !== "string") return {};
  const trimmed = json.trim();
  if (!trimmed || !isJsonObjectOrArrayStart(trimmed)) return {};
  return parseToRecordOrEmpty(trimmed);
}
