/**
 * Parse narrow-focus query string (slash/comma grammar) into JsonItem[] for live preview.
 * Same grammar as AddNestedForm and core createNestedChildren: / = depth, , = siblings.
 */
import { DATA_STR, getIndentFromDisplay } from "now-format";
import type { JsonItem } from "./now";

/**
 * Parses a query string like "A, B / C" into a flat list of JsonItem (new branch only).
 * Levels = split by "/"; each level split by "," for siblings. Display format matches
 * getItemsList: indent + name (no current marker). Keys are "new-0", "new-1", ...
 */
export function parseNarrowQuery(query: string): JsonItem[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const levels = trimmed.split("/").map((l) => l.trim());
  const result: JsonItem[] = [];
  let keyIndex = 0;

  for (let depth = 0; depth < levels.length; depth++) {
    const siblings = levels[depth].split(",").map((s) => s.trim()).filter(Boolean);
    const indent = DATA_STR.indent.repeat(depth);
    for (const name of siblings) {
      const display = `${indent}${name}`;
      result.push({ display, key: `new-${keyIndex}` });
      keyIndex++;
    }
  }

  return result;
}

/**
 * Merges current items with a new branch inserted after the current item.
 * New branch items get their display indented by (current item indent + one level).
 * Keys of new items are left as-is (already unique e.g. new-0, new-1).
 */
export function mergeItemsForAddPreview(
  currentItems: JsonItem[],
  currentKey: string,
  newBranchItems: JsonItem[],
): JsonItem[] {
  if (newBranchItems.length === 0) return currentItems;

  const idx = currentItems.findIndex((i) => i.key === currentKey);
  if (idx < 0) return currentItems;

  const currentDisplay = currentItems[idx].display;
  const currentIndent = getIndentFromDisplay(currentDisplay);
  const oneLevel = DATA_STR.indent;
  const prefix = currentIndent + oneLevel;

  const inserted = newBranchItems.map((item) => ({
    ...item,
    display: prefix + item.display,
  }));

  return [
    ...currentItems.slice(0, idx + 1),
    ...inserted,
    ...currentItems.slice(idx + 1),
  ];
}
