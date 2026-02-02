import { DATA_STR as BASE_DATA_STR } from "now-format";

export const LOG_FILE_PATH = "now.log";
export const NOW_FILE_SUFFIX = "now.md";

export const DATA_STR = {
  ...BASE_DATA_STR,
  rootFocus: "Root Focus",
} as const;

/** Initial content for a new focus file (matches serialize format). */
export const INITIAL_FOCUS_CONTENT =
  `${DATA_STR.lineMarker}${DATA_STR.rootFocus} ${DATA_STR.currentItemMarker}\n`;

// debug mode
export const D = false;
