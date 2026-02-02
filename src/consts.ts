import { DATA_STR as BASE_DATA_STR } from "now-format";

export const LOG_FILE_PATH = "now.log";
export const NOW_FILE_SUFFIX = "now.md";

export const DATA_STR = {
  ...BASE_DATA_STR,
  rootFocus: "Root Focus",
} as const;

/** Builds initial focus file content with optional root label. Sanitizes: trim, newlines → space; empty/whitespace → "Root Focus". */
export function getInitialFocusContent(rootName?: string): string {
  const name =
    (rootName == null ? "" : rootName.replace(/\n/g, " ").trim()) ||
    DATA_STR.rootFocus;
  return `${DATA_STR.lineMarker}${name} ${DATA_STR.currentItemMarker}\n`;
}

/** Initial content for a new focus file (matches serialize format). */
export const INITIAL_FOCUS_CONTENT = getInitialFocusContent();

// debug mode
export const D = false;
