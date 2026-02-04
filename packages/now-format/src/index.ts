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

function findIndexAtDepth(
  items: { display: string }[],
  startIndex: number,
  step: number,
  targetDepth: number,
): number | null {
  const end = step > 0 ? items.length : -1;
  for (let j = startIndex; step > 0 ? j < end : j > end; j += step) {
    const d = getIndentFromDisplay(items[j].display).length;
    if (d === targetDepth) return j;
    if (d < targetDepth) break;
  }
  return null;
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
  const prevSibling = findIndexAtDepth(
    items,
    currentIndex - 1,
    -1,
    currentDepth,
  );
  if (prevSibling !== null) return prevSibling;
  const nextSibling = findIndexAtDepth(
    items,
    currentIndex + 1,
    1,
    currentDepth,
  );
  if (nextSibling !== null) return nextSibling;
  const parentDepth = currentDepth - DATA_STR.indent.length;
  if (parentDepth < 0) return null;
  return findIndexAtDepth(items, currentIndex - 1, -1, parentDepth);
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

function pathSegmentFromDisplay(display: string): string {
  const raw = display.replace(/\s+@\s*$/, "").trimEnd();
  const indStr = getIndentFromDisplay(display);
  return raw.slice(indStr.length).trim() || "—";
}

function pathToBreadcrumbAndFocus(path: string[]): {
  breadcrumb: string;
  focusName: string;
} {
  const focusName = path[path.length - 1] ?? "—";
  const breadcrumb =
    path.length > 1 ? path.slice(0, -1).join(" / ") : "Focusing on";
  return { breadcrumb, focusName };
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
  const indentLen = DATA_STR.indent.length;
  let i = idx;
  while (i >= 0) {
    path.unshift(pathSegmentFromDisplay(items[i].display));
    const depth = getIndentFromDisplay(items[i].display).length;
    if (depth === 0) break;
    const parentDepth = depth - indentLen;
    const parentIdx = findIndexAtDepth(items, i - 1, -1, parentDepth);
    if (parentIdx === null) break;
    i = parentIdx;
  }
  return pathToBreadcrumbAndFocus(path);
}

/** First item at depth (parentDepth + indent) after startIndex; null if none. */
function findFirstChildAtIndex(
  items: { display: string }[],
  startIndex: number,
  parentDepth: number,
  indentLen: number,
): number | null {
  const childDepth = parentDepth + indentLen;
  for (let j = startIndex; j < items.length; j++) {
    const d = getIndentFromDisplay(items[j].display).length;
    if (d <= parentDepth) break;
    if (d === childDepth) return j;
  }
  return null;
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
    const nextIdx = findFirstChildAtIndex(
      items,
      idx + 1,
      depth,
      indentLen,
    );
    if (nextIdx === null) return idx === currentIndex ? null : idx;
    idx = nextIdx;
    depth += indentLen;
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

type PreviewLineContext = {
  currentKey: string;
  selectedKey: string | null;
  selectedAction: PreviewAction;
  nextFocusIndex: number | null;
  diveInTargetIndex: number | null;
};

function applyPrefix(raw: string, prefix: string): string {
  return raw.replace(/^(\s*)(.*)$/, `$1${prefix}$2`);
}

function showCurrentAsPrevious(ctx: PreviewLineContext): boolean {
  return (
    ctx.selectedAction === "add" ||
    (ctx.selectedAction === "dive-in" && ctx.diveInTargetIndex !== null) ||
    (ctx.selectedKey !== null && ctx.selectedKey !== ctx.currentKey)
  );
}

/** Prefix for the current item line only. */
function currentItemPrefix(
  ctx: PreviewLineContext,
): "focus" | "previous" | "complete" | "edit" {
  if (showCurrentAsPrevious(ctx)) return "previous";
  if (ctx.selectedAction === "complete") return "complete";
  if (ctx.selectedAction === "edit") return "edit";
  return "focus";
}

/** True when this non-current line should show the focus prefix (▶). */
function shouldShowNonCurrentAsFocus(
  itemKey: string,
  index: number,
  ctx: PreviewLineContext,
): boolean {
  const isSelected = ctx.selectedKey !== null && itemKey === ctx.selectedKey;
  const isNextFocus =
    ctx.nextFocusIndex !== null && index === ctx.nextFocusIndex;
  const isDiveInTarget =
    ctx.diveInTargetIndex !== null && index === ctx.diveInTargetIndex;
  return (
    (isNextFocus && ctx.selectedAction === "complete") ||
    (isDiveInTarget && ctx.selectedAction === "dive-in") ||
    isSelected
  );
}

/** Returns which prefix to apply for a preview line, or null to leave line unchanged. */
function getPreviewLinePrefix(
  itemKey: string,
  index: number,
  ctx: PreviewLineContext,
): "focus" | "previous" | "complete" | "edit" | null {
  if (itemKey === ctx.currentKey) return currentItemPrefix(ctx);
  if (shouldShowNonCurrentAsFocus(itemKey, index, ctx)) return "focus";
  return null;
}

function formatPreviewLineForItem(
  raw: string,
  itemKey: string,
  index: number,
  ctx: PreviewLineContext,
): string {
  const prefix = getPreviewLinePrefix(itemKey, index, ctx);
  if (prefix === null) return raw;
  if (prefix === "previous") return applyPrefix(raw, PREVIOUS_FOCUS_PREFIX);
  if (prefix === "focus") return applyPrefix(raw, FOCUS_PREFIX);
  const line = applyPrefix(raw, FOCUS_PREFIX);
  return prefix === "complete"
    ? line.replace(FOCUS_PREFIX, "✓ ")
    : line.replace(FOCUS_PREFIX, "✎ ");
}

function insertPlaceholderAfterCurrent(
  lines: string[],
  currentIndex: number,
  placeholder: string,
): string[] {
  return [
    ...lines.slice(0, currentIndex + 1),
    placeholder,
    ...lines.slice(currentIndex + 1),
  ];
}

function applyPlaceholderToLines(
  lines: string[],
  currentIndex: number,
  currentIndent: string,
  selectedAction: PreviewAction,
): string[] {
  if (currentIndex < 0) return lines;
  switch (selectedAction) {
    case "add":
      return insertPlaceholderAfterCurrent(
        lines,
        currentIndex,
        getPlaceholderNarrow(currentIndent),
      );
    case "later":
      return insertPlaceholderAfterCurrent(
        lines,
        currentIndex,
        getPlaceholderLater(currentIndent),
      );
    case "wrap": {
      const { wrapParentLine, indentedCurrentLine } = getPlaceholderWrap(
        currentIndent,
        lines[currentIndex],
      );
      return [
        ...lines.slice(0, currentIndex),
        wrapParentLine,
        indentedCurrentLine,
        ...lines.slice(currentIndex + 1),
      ];
    }
    default:
      return lines;
  }
}

function buildPreviewContentLines(
  items: JsonItem[],
  ctx: PreviewLineContext,
  currentIndex: number,
  currentIndent: string,
  selectedAction: PreviewAction,
): string[] {
  const lines = items.map((item, index) => {
    const raw = item.display.replace(/\s+@\s*$/, "").trimEnd();
    return formatPreviewLineForItem(raw, item.key, index, ctx);
  });
  return applyPlaceholderToLines(
    lines,
    currentIndex,
    currentIndent,
    selectedAction,
  );
}

function resolvePreviewHeaderBreadcrumbAndFocus(
  items: JsonItem[],
  breadcrumb: string,
  currentItemName: string,
  selectedAction: PreviewAction,
  diveInTargetIndex: number | null,
): { rawBreadcrumb: string; headerFocusName: string } {
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
  return { rawBreadcrumb, headerFocusName };
}

function buildPreviewHeader(
  rawBreadcrumb: string,
  headerFocusName: string,
  breadcrumbMaxLength: number | undefined,
): string {
  const line1 =
    breadcrumbMaxLength != null && breadcrumbMaxLength > 0
      ? truncateBreadcrumb(rawBreadcrumb, breadcrumbMaxLength)
      : rawBreadcrumb;
  const line2 = `${DATA_STR.focus} **${headerFocusName}**`;
  return (line1 ? line1 + "\n\n" : "") + line2 + "\n\n";
}

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

  const ctx: PreviewLineContext = {
    currentKey,
    selectedKey,
    selectedAction,
    nextFocusIndex,
    diveInTargetIndex,
  };

  const lines = buildPreviewContentLines(
    items,
    ctx,
    currentIndex,
    currentIndent,
    selectedAction,
  );
  const { rawBreadcrumb, headerFocusName } =
    resolvePreviewHeaderBreadcrumbAndFocus(
      items,
      breadcrumb,
      currentItemName,
      selectedAction,
      diveInTargetIndex,
    );
  const header = buildPreviewHeader(
    rawBreadcrumb,
    headerFocusName,
    breadcrumbMaxLength,
  );
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
