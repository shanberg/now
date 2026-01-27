/**
 * @fileoverview Tree serialization: deserialize markdown to TreeNode, serialize TreeNode to markdown.
 */
import { TreeNode } from "../../types.d.ts";
import { DATA_STR } from "../consts.ts";

/**
 * Parses a single markdown list line into indent, name, and current-marker.
 * @param line - One line of markdown list.
 * @returns { spaces, indent, name, isMarkedCurrent }.
 */
function parseLine(
  line: string,
): { spaces: number; indent: number; name: string; isMarkedCurrent: boolean } {
  const spaces = line.search(/\S/);
  const indent = Math.ceil(spaces / DATA_STR.indent.length);
  const isMarkedCurrent = line.endsWith(" " + DATA_STR.currentItemMarker);
  const name = line
    .trimStart()
    .slice(DATA_STR.lineMarker.length)
    .replace(" " + DATA_STR.currentItemMarker, "");
  return { spaces, indent, name, isMarkedCurrent };
}

/**
 * Validates at most one current marker; throws if a second is seen.
 * @param isMarkedCurrent - Whether this line has the current marker.
 * @param hasFoundCurrent - Whether we already saw a current marker.
 * @param line - Line content for error message.
 * @returns Updated hasFoundCurrent.
 */
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

/**
 * Sets root to newNode if null; throws if root already set (multiple roots).
 * @param root - Current root or null.
 * @param newNode - Node to set as root.
 * @param line - Line content for error message.
 * @returns The root node.
 */
function setRoot(
  root: TreeNode | null,
  newNode: TreeNode,
  line: string,
): TreeNode {
  if (!root) return newNode;
  throw new Error(`Multiple root nodes found at line: "${line}"`);
}

/**
 * Resolves effective indent level from prev/current spaces and indent.
 * @param prevSpaces - Leading spaces on previous line.
 * @param prevIndent - Indent level of previous line.
 * @param spaces - Leading spaces on current line.
 * @param indent - Raw indent level of current line.
 * @returns Resolved indent level.
 */
function effectiveIndent(
  prevSpaces: number,
  prevIndent: number,
  spaces: number,
  indent: number,
): number {
  if (spaces > prevSpaces || indent > prevIndent + 1) return prevIndent + 1;
  return indent;
}

/**
 * Pops stack entries until parent indent is less than the given indent.
 * @param stack - Stack of { node, indent }.
 * @param indent - Target indent; pops until stack top has lower indent.
 * @returns void
 */
function popStackToParent(
  stack: { node: TreeNode; indent: number }[],
  indent: number,
): void {
  while (stack.length && stack[stack.length - 1].indent >= indent) {
    stack.pop();
  }
}

/**
 * Attaches newNode to the correct parent on the stack and returns used indent.
 * @param newNode - Node to attach.
 * @param stack - Stack of { node, indent }.
 * @param indent - Indent of newNode.
 * @param prevIndent - Indent of previous line.
 * @param prevSpaces - Leading spaces of previous line.
 * @param spaces - Leading spaces of current line.
 * @param line - Line content for error message.
 * @returns Resolved indent used for newNode.
 */
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

/**
 * Mutable state used during deserialization.
 * @property stack - Stack of { node, indent } for parent resolution.
 * @property keyCounter - Counter for assigning keys to new nodes.
 * @property root - Root node once found; null until first line processed.
 * @property hasFoundCurrent - Whether a current-marker line has been seen.
 * @property prevSpaces - Leading spaces on the previous line.
 */
type DeserializeState = {
  stack: { node: TreeNode; indent: number }[];
  keyCounter: number;
  root: TreeNode | null;
  hasFoundCurrent: boolean;
  prevSpaces: number;
};

/**
 * Processes one line and updates deserialize state (stack, root, current marker).
 * @param state - Mutable deserialize state.
 * @param line - One non-empty line of markdown list.
 */
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

/**
 * Deserializes a markdown string into a tree structure.
 * @param {string} input - The markdown string to deserialize.
 * @returns {TreeNode} The root node of the tree structure.
 */
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

/**
 * Serializes a tree structure into a markdown string.
 * @param {TreeNode} tree - The root node of the tree structure.
 * @returns {string} The serialized markdown string.
 */
export function serialize(tree: TreeNode): string {
  let result = "";

  /** Appends markdown lines for this node and descendants. */
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
