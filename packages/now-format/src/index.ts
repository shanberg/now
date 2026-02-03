/**
 * Shared .now.md format: deserialize, serialize, and navigation.
 * Used by the Deno CLI and Raycast extension.
 */
import { DATA_STR } from "./constants.ts";
import type { JsonFocus, JsonItem, TreeNode } from "./types.ts";

function parseLine(line: string): {
  spaces: number;
  indent: number;
  name: string;
  isMarkedCurrent: boolean;
} {
  const spaces = line.search(/\S/);
  const indent = Math.ceil(spaces / DATA_STR.indent.length);
  const isMarkedCurrent = line.endsWith(" " + DATA_STR.currentItemMarker);
  const name = line
    .trimStart()
    .slice(DATA_STR.lineMarker.length)
    .replace(" " + DATA_STR.currentItemMarker, "");
  return { spaces, indent, name, isMarkedCurrent };
}

function checkCurrentMarker(
  isMarkedCurrent: boolean,
  hasFoundCurrent: boolean,
  line: string,
): boolean {
  if (isMarkedCurrent) {
    if (hasFoundCurrent) {
      throw new Error(`Multiple items marked as current at line: "${line}"`);
    }
    return true;
  }
  return hasFoundCurrent;
}

function setRoot(
  root: TreeNode | null,
  newNode: TreeNode,
  line: string,
): TreeNode {
  if (!root) return newNode;
  throw new Error(`Multiple root nodes found at line: "${line}"`);
}

function effectiveIndent(
  prevSpaces: number,
  prevIndent: number,
  spaces: number,
  indent: number,
): number {
  if (spaces > prevSpaces || indent > prevIndent + 1) return prevIndent + 1;
  return indent;
}

function popStackToParent(
  stack: { node: TreeNode; indent: number }[],
  indent: number,
): void {
  while (stack.length && stack[stack.length - 1].indent >= indent) {
    stack.pop();
  }
}

function attachChild(
  newNode: TreeNode,
  stack: { node: TreeNode; indent: number }[],
  indent: number,
  prevIndent: number,
  prevSpaces: number,
  spaces: number,
  line: string,
): number {
  const resolved = effectiveIndent(prevSpaces, prevIndent, spaces, indent);
  popStackToParent(stack, resolved);
  if (stack.length === 0) {
    throw new Error(`Invalid indentation at line: "${line}"`);
  }
  stack[stack.length - 1].node.children.push(newNode);
  return resolved;
}

type DeserializeState = {
  stack: { node: TreeNode; indent: number }[];
  keyCounter: number;
  root: TreeNode | null;
  hasFoundCurrent: boolean;
  prevSpaces: number;
};

function processLine(state: DeserializeState, line: string): void {
  const { spaces, indent, name, isMarkedCurrent } = parseLine(line);
  const newNode: TreeNode = {
    key: (state.keyCounter++).toString(),
    name,
    children: [],
    isCurrent: state.hasFoundCurrent ? false : isMarkedCurrent,
  };

  state.hasFoundCurrent = checkCurrentMarker(
    isMarkedCurrent,
    state.hasFoundCurrent,
    line,
  );

  if (indent === 0) {
    state.root = setRoot(state.root, newNode, line);
    state.stack.push({ node: newNode, indent });
  } else {
    const prevIndent = state.stack[state.stack.length - 1].indent;
    const usedIndent = attachChild(
      newNode,
      state.stack,
      indent,
      prevIndent,
      state.prevSpaces,
      spaces,
      line,
    );
    state.stack.push({ node: newNode, indent: usedIndent });
  }
  state.prevSpaces = spaces;
}

export function deserialize(input: string): TreeNode {
  const lines = input.split(DATA_STR.lineSeparator);
  const state: DeserializeState = {
    stack: [],
    keyCounter: 0,
    root: null,
    hasFoundCurrent: false,
    prevSpaces: 0,
  };

  for (const line of lines) {
    if (!line.trim()) continue;
    processLine(state, line);
  }

  if (!state.root) {
    throw new Error("Root node not found in the input content.");
  }
  if (!state.hasFoundCurrent) {
    state.root.isCurrent = true;
  }
  return state.root;
}

export function serialize(tree: TreeNode): string {
  let result = "";
  function traverse(node: TreeNode, depth: number) {
    const prefix = DATA_STR.indent.repeat(depth) + "- ";
    const marker = node.isCurrent ? " " + DATA_STR.currentItemMarker : "";
    result += `${prefix}${node.name}${marker}\n`;
    for (const child of node.children) {
      traverse(child, depth + 1);
    }
  }
  traverse(tree, 0);
  return result;
}

export function getItemsList(tree: TreeNode): [string, string][] {
  const items: [string, string][] = [];
  function traverse(node: TreeNode, depth: number) {
    const indent = DATA_STR.indent.repeat(depth);
    const marker = node.isCurrent ? " " + DATA_STR.currentItemMarker : "";
    items.push([`${indent}${node.name}${marker}`, node.key]);
    for (const child of node.children) {
      traverse(child, depth + 1);
    }
  }
  traverse(tree, 0);
  return items;
}

export function getNodesList(tree: TreeNode): TreeNode[] {
  const items: TreeNode[] = [];
  function traverse(node: TreeNode) {
    items.push(node);
    for (const child of node.children) {
      traverse(child);
    }
  }
  traverse(tree);
  return items;
}

export function getCurrentItemBreadcrumb(tree: TreeNode): string {
  let breadcrumb: string[] = [];
  let currentName = "";

  function traverse(node: TreeNode, path: string[]) {
    if (node.isCurrent) {
      breadcrumb = path;
      currentName = node.name;
      return true;
    }
    for (const child of node.children) {
      if (traverse(child, [...path, node.name])) return true;
    }
    return false;
  }
  traverse(tree, []);
  const breadcrumbPath = breadcrumb.join(" / ");
  if (!breadcrumbPath) return currentName;
  return [breadcrumbPath, currentName].join(" / ");
}

function countDescendants(node: TreeNode): number {
  let count = node.children.length;
  for (const child of node.children) {
    count += countDescendants(child);
  }
  return count;
}

type CurrentNodeMetadata = {
  isLeaf: boolean;
  depth: number;
  siblingCount: number;
  descendantCount: number;
  key: string;
};

function buildCurrentNodeMetadata(
  node: TreeNode,
  depth: number,
  parent: TreeNode | null,
): CurrentNodeMetadata {
  const siblingCount = parent ? parent.children.length - 1 : 0;
  return {
    isLeaf: node.children.length === 0,
    depth,
    siblingCount,
    descendantCount: countDescendants(node),
    key: node.key,
  };
}

function splitBreadcrumbPath(breadcrumbPath: string): {
  breadcrumbStr: string;
  focusStr: string;
} {
  const parts = breadcrumbPath.split(" / ");
  if (parts.length <= 1) {
    return { breadcrumbStr: "Focusing on", focusStr: breadcrumbPath };
  }
  const focusStr = parts[parts.length - 1];
  const breadcrumbStr = parts.slice(0, -1).join(" / ");
  return { breadcrumbStr, focusStr };
}

type CurrentItemDetailsResult = {
  pathSegments: string[];
  currentName: string;
  metadata: CurrentNodeMetadata | null;
};

/** Single traverse: collect path segments, current name, and metadata when node.isCurrent is found. */
function getCurrentItemDetailsInternal(
  tree: TreeNode,
): CurrentItemDetailsResult {
  let pathSegments: string[] = [];
  let currentName = "";
  let metadata: CurrentNodeMetadata | null = null;

  function traverse(
    node: TreeNode,
    depth: number,
    parent: TreeNode | null,
    path: string[],
  ): boolean {
    if (node.isCurrent) {
      pathSegments = path;
      currentName = node.name;
      metadata = buildCurrentNodeMetadata(node, depth, parent);
      return true;
    }
    for (const child of node.children) {
      if (traverse(child, depth + 1, node, [...path, node.name])) return true;
    }
    return false;
  }
  traverse(tree, 0, null, []);
  return { pathSegments, currentName, metadata };
}

export function getCurrentItemDetails(tree: TreeNode): {
  breadcrumbStr: string;
  focusStr: string;
  isRoot: boolean;
  isLeaf: boolean;
  depth: number;
  siblingCount: number;
  descendantCount: number;
  key: string;
} {
  const { pathSegments, currentName, metadata } =
    getCurrentItemDetailsInternal(tree);
  const breadcrumbPath = pathSegments.join(" / ");
  const fullPath = breadcrumbPath
    ? [breadcrumbPath, currentName].join(" / ")
    : currentName;
  const { breadcrumbStr, focusStr } = splitBreadcrumbPath(fullPath);

  if (!metadata) {
    return {
      breadcrumbStr,
      focusStr,
      isRoot: true,
      isLeaf: true,
      depth: 0,
      siblingCount: 0,
      descendantCount: 0,
      key: "",
    };
  }

  return {
    breadcrumbStr,
    focusStr,
    isRoot: metadata.depth === 0,
    isLeaf: metadata.isLeaf,
    depth: metadata.depth,
    siblingCount: metadata.siblingCount,
    descendantCount: metadata.descendantCount,
    key: metadata.key,
  };
}

/** Leading indent from a display string (same convention as getItemsList output: strip trailing " @", then leading whitespace). */
export function getIndentFromDisplay(display: string): string {
  const raw = display.replace(/\s+@\s*$/, "").trimEnd();
  const m = raw.match(/^(\s*)/);
  return m ? m[1] : "";
}

/**
 * Index of the item that would be next in focus after completing the current item.
 * Matches selectNewCurrentAfterRemoval: previous sibling's last leaf, else next sibling's first leaf, else parent.
 */
export function getNextFocusIndex(
  items: { display: string }[],
  currentIndex: number,
): number | null {
  if (currentIndex < 0 || currentIndex >= items.length) return null;
  const currentDepth = getIndentFromDisplay(items[currentIndex].display).length;
  // Previous sibling's last leaf: walk back, first with same depth
  for (let j = currentIndex - 1; j >= 0; j--) {
    const d = getIndentFromDisplay(items[j].display).length;
    if (d === currentDepth) return j;
    if (d < currentDepth) break;
  }
  // Next sibling's first leaf: walk forward, first with same depth
  for (let j = currentIndex + 1; j < items.length; j++) {
    const d = getIndentFromDisplay(items[j].display).length;
    if (d === currentDepth) return j;
    if (d < currentDepth) break;
  }
  // Parent: walk back, first with depth one level up
  const parentDepth = currentDepth - DATA_STR.indent.length;
  if (parentDepth < 0) return null;
  for (let j = currentIndex - 1; j >= 0; j--) {
    if (getIndentFromDisplay(items[j].display).length === parentDepth) return j;
  }
  return null;
}

/** Placeholder line for "narrow focus" (add child): insert after current line. */
export function getPlaceholderNarrow(currentIndent: string): string {
  return `${currentIndent}${DATA_STR.indent}${DATA_STR.focus} ${DATA_STR.placeholder}`;
}

/** Placeholder line for "add followup" (add sibling): insert after current line. */
export function getPlaceholderLater(currentIndent: string): string {
  return `${currentIndent}✎ ${DATA_STR.placeholder}`;
}

/** Placeholder for "wrap": new parent line and current line indented one level. */
export function getPlaceholderWrap(
  currentIndent: string,
  currentLine: string,
): { wrapParentLine: string; indentedCurrentLine: string } {
  const wrapParentLine = `${currentIndent}✎ ${DATA_STR.placeholder}`;
  const indentedCurrentLine = currentLine.replace(
    /^(\s*)(.*)$/,
    `${DATA_STR.indent}$1$2`,
  );
  return { wrapParentLine, indentedCurrentLine };
}

/**
 * Returns breadcrumb and focus name for an item by key, using the flat items list.
 * Used so extensions can show "preview as if this item were focus" for switch-target items.
 */
export function getBreadcrumbAndNameForKey(
  items: JsonItem[],
  key: string,
): { breadcrumb: string; focusName: string } {
  const idx = items.findIndex((i) => i.key === key);
  if (idx < 0) return { breadcrumb: "", focusName: "—" };
  const path: string[] = [];
  let i = idx;
  const indentLen = DATA_STR.indent.length;
  while (i >= 0) {
    const raw = items[i].display.replace(/\s+@\s*$/, "").trimEnd();
    const indStr = getIndentFromDisplay(items[i].display);
    const name = raw.slice(indStr.length).trim() || "—";
    path.unshift(name);
    const depth = indStr.length;
    if (depth === 0) break;
    const parentDepth = depth - indentLen;
    let parentIdx = -1;
    for (let j = i - 1; j >= 0; j--) {
      if (getIndentFromDisplay(items[j].display).length === parentDepth) {
        parentIdx = j;
        break;
      }
    }
    i = parentIdx;
  }
  const focusName = path[path.length - 1] ?? "—";
  const breadcrumb =
    path.length > 1 ? path.slice(0, -1).join(" / ") : "Focusing on";
  return { breadcrumb, focusName };
}

/**
 * Index of the first deepest descendant of the item at currentIndex (dive-in target).
 * Follows first child until leaf; returns null if the current item has no children.
 */
export function getFirstDeepestChildIndex(
  items: { display: string }[],
  currentIndex: number,
): number | null {
  if (currentIndex < 0 || currentIndex >= items.length) return null;
  const indentLen = DATA_STR.indent.length;
  let idx = currentIndex;
  let depth = getIndentFromDisplay(items[idx].display).length;
  while (true) {
    const childDepth = depth + indentLen;
    let nextIdx: number | null = null;
    for (let j = idx + 1; j < items.length; j++) {
      const d = getIndentFromDisplay(items[j].display).length;
      if (d <= depth) break;
      if (d === childDepth) {
        nextIdx = j;
        break;
      }
    }
    if (nextIdx === null) return idx === currentIndex ? null : idx;
    idx = nextIdx;
    depth = childDepth;
  }
}

/** Valid values for selectedAction in buildPreviewMarkdown. Single source of truth for CLI and extensions. */
export const PREVIEW_ACTION_VALUES = [
  "complete",
  "add",
  "later",
  "wrap",
  "edit",
  "dive-in",
] as const;

export type PreviewAction = (typeof PREVIEW_ACTION_VALUES)[number] | null;

/**
 * Truncates a string from the center when it exceeds maxLength.
 * Uses a single "…" in the middle. If maxLength <= 0 or text.length <= maxLength, returns text unchanged.
 */
export function truncateBreadcrumb(text: string, maxLength: number): string {
  if (maxLength <= 0 || text.length <= maxLength) return text;
  const ellipsis = "…";
  const take = maxLength - ellipsis.length;
  const left = Math.floor(take / 2);
  const right = take - left;
  return text.slice(0, left) + ellipsis + text.slice(-right);
}

const FOCUS_PREFIX = `${DATA_STR.focus} `;
const PREVIOUS_FOCUS_PREFIX = `${DATA_STR.focusPrevious} `;

/**
 * Builds markdown showing all items with indentation, current focus and selected item (▶),
 * and command-specific placeholders/indicators. Used by CLI `now json preview` and extensions.
 * When breadcrumbMaxLength is set and > 0, the breadcrumb line is center-truncated via truncateBreadcrumb.
 */
export function buildPreviewMarkdown(
  items: JsonItem[],
  currentKey: string,
  breadcrumb: string,
  currentItemName: string,
  selectedKey: string | null,
  selectedAction: PreviewAction,
  breadcrumbMaxLength?: number,
): string {
  const currentIndex = items.findIndex((i) => i.key === currentKey);
  const currentIndent =
    currentIndex >= 0 ? getIndentFromDisplay(items[currentIndex].display) : "";
  const nextFocusIndex =
    selectedAction === "complete" && currentIndex >= 0
      ? getNextFocusIndex(items, currentIndex)
      : null;
  const diveInTargetIndex =
    selectedAction === "dive-in" && currentIndex >= 0
      ? getFirstDeepestChildIndex(items, currentIndex)
      : null;

  let lines = items.map((item, index) => {
    const raw = item.display.replace(/\s+@\s*$/, "").trimEnd();
    const isCurrent = item.key === currentKey;
    const isSelected = selectedKey !== null && item.key === selectedKey;
    const isNextFocus = nextFocusIndex !== null && index === nextFocusIndex;
    const isDiveInTarget =
      diveInTargetIndex !== null && index === diveInTargetIndex;
    let line = raw;
    if (isCurrent) {
      if (selectedAction === "add") {
        line = raw.replace(/^(\s*)(.*)$/, `$1${PREVIOUS_FOCUS_PREFIX}$2`);
      } else if (selectedAction === "dive-in" && diveInTargetIndex !== null) {
        line = raw.replace(/^(\s*)(.*)$/, `$1${PREVIOUS_FOCUS_PREFIX}$2`);
      } else if (selectedKey !== null && selectedKey !== currentKey) {
        line = raw.replace(/^(\s*)(.*)$/, `$1${PREVIOUS_FOCUS_PREFIX}$2`);
      } else {
        line = raw.replace(/^(\s*)(.*)$/, `$1${FOCUS_PREFIX}$2`);
        if (selectedAction === "complete") {
          line = line.replace(FOCUS_PREFIX, "✓ ");
        } else if (selectedAction === "edit") {
          line = line.replace(FOCUS_PREFIX, "✎ ");
        }
      }
    } else if (isNextFocus && selectedAction === "complete") {
      line = raw.replace(/^(\s*)(.*)$/, `$1${FOCUS_PREFIX}$2`);
    } else if (isDiveInTarget && selectedAction === "dive-in") {
      line = raw.replace(/^(\s*)(.*)$/, `$1${FOCUS_PREFIX}$2`);
    } else if (isSelected) {
      line = raw.replace(/^(\s*)(.*)$/, `$1${FOCUS_PREFIX}$2`);
    }
    return line;
  });

  if (selectedAction === "add" && currentIndex >= 0) {
    const placeholder = getPlaceholderNarrow(currentIndent);
    lines = [
      ...lines.slice(0, currentIndex + 1),
      placeholder,
      ...lines.slice(currentIndex + 1),
    ];
  }

  if (selectedAction === "later" && currentIndex >= 0) {
    const placeholder = getPlaceholderLater(currentIndent);
    lines = [
      ...lines.slice(0, currentIndex + 1),
      placeholder,
      ...lines.slice(currentIndex + 1),
    ];
  }

  if (selectedAction === "wrap" && currentIndex >= 0) {
    const { wrapParentLine, indentedCurrentLine } = getPlaceholderWrap(
      currentIndent,
      lines[currentIndex],
    );
    lines = [
      ...lines.slice(0, currentIndex),
      wrapParentLine,
      indentedCurrentLine,
      ...lines.slice(currentIndex + 1),
    ];
  }

  let rawBreadcrumb = breadcrumb || "";
  let headerFocusName = currentItemName || "—";
  if (
    selectedAction === "dive-in" &&
    diveInTargetIndex !== null &&
    items[diveInTargetIndex]
  ) {
    const after = getBreadcrumbAndNameForKey(items, items[diveInTargetIndex].key);
    rawBreadcrumb = after.breadcrumb;
    headerFocusName = after.focusName;
  }
  const line1 =
    breadcrumbMaxLength != null && breadcrumbMaxLength > 0
      ? truncateBreadcrumb(rawBreadcrumb, breadcrumbMaxLength)
      : rawBreadcrumb;
  const line2 = `${DATA_STR.focus} **${headerFocusName}**`;
  const header = (line1 ? line1 + "\n\n" : "") + line2 + "\n\n";
  return header + "```\n" + lines.join("\n") + "\n```";
}

/**
 * Parse .now.md content and return focus + items (for extensions that read the file directly).
 */
export function parseFocusFileContent(content: string): {
  focus: JsonFocus;
  items: JsonItem[];
} {
  const trimmed = content.trim();
  if (!trimmed) throw new Error("Empty file");

  const tree = deserialize(content);
  const d = getCurrentItemDetails(tree);
  const focus: JsonFocus = {
    focus: d.focusStr,
    breadcrumb: d.breadcrumbStr,
    key: d.key,
    isLeaf: d.isLeaf,
    isRoot: d.isRoot,
    siblingCount: d.siblingCount,
  };
  const items: JsonItem[] = getItemsList(tree).map(([display, key]) => ({
    display,
    key,
  }));
  return { focus, items };
}

export type { JsonFocus, JsonItem, TreeNode };
export { DATA_STR } from "./constants.ts";
