import { TreeNode } from "../../types.d.ts";
import { DATA_STR } from "../consts.ts";

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
