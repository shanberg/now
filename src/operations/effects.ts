/**
 * @fileoverview Side-effecting operations: get/save tree from file, validate, and effect wrappers for all tree ops.
 */
import { D } from "../consts.ts";
import { type TreeNode } from "../../types.d.ts";
import {
  getCurrentItemBreadcrumb,
  getItemsList,
  getNodesList,
} from "./treeNavigation.ts";
import {
  addChildToCurrentItem,
  addNextSiblingToCurrentItem,
  completeCurrentItem,
  createNestedChildren,
  diveIn,
  editCurrentItemName,
  focusFirstChild,
  focusNextSibling,
  focusParent,
  focusPreviousSibling,
  moveNodeToNewParent,
  setCurrentItem,
  wrapCurrentItemInNewParent,
} from "./treeManipulation.ts";
import {
  logAction,
  readMarkdownFile,
  writeMarkdownFile,
} from "./fileOperations.ts";
import { deserialize, serialize } from "./treeSerialization.ts";

/**
 * Retrieves the tree structure from the markdown file.
 * @param {string} path - The path to the markdown file.
 * @returns {Promise<TreeNode>} The root node of the tree structure.
 */
export const getTree = async (path: string): Promise<TreeNode> => {
  const content = await readMarkdownFile(path);
  if (!content.trim()) {
    throw new Error(
      `Could not read focus file at ${path} (missing or empty). Create it with: NOW_FILE=${path} now init`,
    );
  }
  let tree: TreeNode;
  try {
    tree = deserialize(content);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Could not read focus file at ${path}: ${detail}. Fix the file format or run NOW_FILE=${path} now init to recreate.`,
    );
  }
  D && validateTree(tree, "getTree");
  return tree;
};

/**
 * Writes the tree to the markdown file after serializing and optionally validating.
 * @param {TreeNode} tree - Root node of the tree.
 * @param {string} path - Path to the markdown file.
 * @returns {Promise<void>} Promise that resolves when the file has been written.
 */
const writeTree = async (tree: TreeNode, path: string): Promise<void> => {
  const serialized = serialize(tree);
  D && validateTree(tree, "writeTree");
  await writeMarkdownFile(serialized, path);
  return;
};

/**
 * Loads tree from path, applies a pure mutation, validates, writes, and returns the new tree.
 * Use for all effects that follow getTree -> op(tree) -> validate -> writeTree.
 * @param {string} path - Path to the markdown file.
 * @param {(tree: TreeNode) => TreeNode} op - Pure function (tree) => newTree.
 * @param {string} caller - Name used in validation logs.
 * @returns {Promise<TreeNode>} The updated tree.
 */
async function mutateTree(
  path: string,
  op: (tree: TreeNode) => TreeNode,
  caller: string,
): Promise<TreeNode> {
  const tree = await getTree(path);
  const newTree = op(tree);
  D && validateTree(newTree, caller);
  await writeTree(newTree, path);
  return newTree;
}

/**
 * Applies a pure mutation to an already-loaded tree, validates, writes, and returns the new tree.
 * Does not read the file again. Use when the caller already has the tree (e.g. move, complete).
 * @param {string} path - Path to the markdown file.
 * @param {TreeNode} tree - Pre-read tree.
 * @param {(tree: TreeNode) => TreeNode} op - Pure function (tree) => newTree.
 * @param {string} caller - Name used in validation logs.
 * @returns {Promise<TreeNode>} The updated tree.
 */
async function mutateTreeWithTree(
  path: string,
  tree: TreeNode,
  op: (tree: TreeNode) => TreeNode,
  caller: string,
): Promise<TreeNode> {
  const newTree = op(tree);
  D && validateTree(newTree, caller);
  await writeTree(newTree, path);
  return newTree;
}

/**
 * Builds an effect that mutates the tree and returns void.
 * @param {string} name - Caller name for validation.
 * @param { (tree: TreeNode, ...args: T) => TreeNode } op - Pure op (tree, ...args) => newTree.
 * @returns { (path: string, ...args: T) => Promise<void> } Async (path, ...args) => Promise<void>.
 */
function mutationEffectVoid<T extends unknown[]>(
  name: string,
  op: (tree: TreeNode, ...args: T) => TreeNode,
): (path: string, ...args: T) => Promise<void> {
  return async (path: string, ...args: T) => {
    await mutateTree(path, (t) => op(t, ...args), name);
  };
}

/**
 * Builds an effect that mutates the tree and returns the new tree (path-only).
 * @param {string} name - Caller name for validation.
 * @param { (tree: TreeNode) => TreeNode } op - Pure op (tree) => newTree.
 * @returns { (path: string) => Promise<TreeNode> } Async (path) => Promise<TreeNode>.
 */
function focusEffect(
  name: string,
  op: (tree: TreeNode) => TreeNode,
): (path: string) => Promise<TreeNode> {
  return (path: string) => mutateTree(path, op, name);
}

/**
 * Validates the tree structure to ensure only one node is marked as current.
 * @param {TreeNode} tree - The root node of the tree structure.
 * @param {string} [caller] - Name used in validation logs.
 * @returns {void}
 * @throws {Error} If multiple nodes are marked as current.
 */
export function validateTree(tree: TreeNode, caller = "validateTree"): void {
  let currentCount = 0;

  /**
   * Counts nodes marked current; logs error if multiple or none.
   * @param node - Subtree to walk.
   */
  function traverse(node: TreeNode): void {
    if (node.isCurrent) {
      currentCount++;
      if (currentCount > 1) {
        console.error(
          `(${caller}) Multiple nodes marked as current: ${node.name}`,
        );
        // throw new Error(`Multiple nodes marked as current: ${node.name}`);
      }
    }
    for (const child of node.children) {
      traverse(child);
    }
  }

  traverse(tree);

  if (currentCount === 0) {
    console.error(`(${caller}) No node is marked as current`);
  }
}

/**
 * Retrieves the list of items in the tree structure.
 * @param {string} path - The path to the markdown file.
 * @returns {Promise<[string, string][]>} The list of items.
 */
export async function getItemsListEffect(
  path: string,
): Promise<[string, string][]> {
  const tree = await getTree(path);
  D && validateTree(tree, "getItemsListEffect");
  return getItemsList(tree);
}

/**
 * Retrieves the list of items in the tree structure.
 * @param {string} path - The path to the markdown file.
 * @returns {Promise<TreeNode[]>} The list of nodes.
 */
export async function getNodesListEffect(path: string): Promise<TreeNode[]> {
  const tree = await getTree(path);
  D && validateTree(tree, "getNodesListEffect");
  return getNodesList(tree);
}

/**
 * Adds a new child item to the current item in the tree structure.
 * @param {string} newText - The name of the new child item.
 * @param {string} path - The path to the markdown file.
 * @returns {Promise<void>}
 */
export const addChildToCurrentItemEffect = mutationEffectVoid(
  "addChildToCurrentItemEffect",
  addChildToCurrentItem,
);

/**
 * Adds a sequence of nested children to the current item in the tree structure.
 * The last item in the list will be the new current item.
 * @param {string} items - The comma-separated list of items to add.
 * @param {string} path - The path to the markdown file.
 * @returns {Promise<void>}
 */
export const createNestedChildrenEffect = mutationEffectVoid(
  "createNestedChildrenEffect",
  createNestedChildren,
);

/**
 * Adds a new sibling item after the current item in the tree structure.
 * @param {string} newText - The name of the new sibling item.
 * @param {string} path - The path to the markdown file.
 * @returns {Promise<void>}
 */
export const addNextSiblingToCurrentItemEffect = mutationEffectVoid(
  "addNextSiblingToCurrentItemEffect",
  addNextSiblingToCurrentItem,
);

/**
 * Completes the current item in the tree structure.
 * @param {string} path - The path to the markdown file.
 */
export async function completeCurrentItemEffect(path: string): Promise<void> {
  const tree = await getTree(path);
  const item = getCurrentItemBreadcrumb(tree);
  await mutateTreeWithTree(path, tree, completeCurrentItem, "completeCurrentItemEffect");
  await logAction("Complete", item);
}

/**
 * Sets the current item in the tree structure based on the provided key.
 * @param {string} key - The key of the item to set as current.
 * @param {string} path - The path to the markdown file.
 * @returns {Promise<void>}
 */
export const setCurrentItemEffect = mutationEffectVoid(
  "setCurrentItemEffect",
  setCurrentItem,
);

/**
 * Edits the name of the current item in the tree structure.
 * @param {string} newName - The new name for the current item.
 * @param {string} path - The path to the markdown file.
 * @returns {Promise<void>}
 */
export const editCurrentItemNameEffect = mutationEffectVoid(
  "editCurrentItemNameEffect",
  editCurrentItemName,
);

/**
 * Retrieves the breadcrumb path of the current item in the tree structure.
 * @param {string} path - The path to the markdown file.
 * @returns {Promise<string>} The breadcrumb path of the current item.
 */
export async function getCurrentItemBreadcrumbEffect(
  path: string,
): Promise<string> {
  const tree = await getTree(path);
  D && validateTree(tree, "getCurrentItemBreadcrumbEffect");
  return getCurrentItemBreadcrumb(tree);
}

/**
 * Dives into the current item.
 * @param {string} path - The path to the markdown file.
 * @returns {Promise<TreeNode>} The root node of the tree structure.
 */
export const diveInEffect = focusEffect("diveInEffect", diveIn);

/**
 * Changes focus to the next sibling item in the tree structure.
 * If the current item is the last sibling, it cycles to the first sibling.
 * If no siblings exist, the focus remains unchanged.
 * @param {string} path - The path to the markdown file.
 * @returns {Promise<TreeNode>} The updated tree structure.
 */
export const focusNextSiblingEffect = focusEffect(
  "focusNextSiblingEffect",
  focusNextSibling,
);

/**
 * Changes focus to the previous sibling item in the tree structure.
 * If the current item is the first sibling, it cycles to the last sibling.
 * If no siblings exist, the focus remains unchanged.
 * @param {string} path - The path to the markdown file.
 * @returns {Promise<TreeNode>} The updated tree structure.
 */
export const focusPreviousSiblingEffect = focusEffect(
  "focusPreviousSiblingEffect",
  focusPreviousSibling,
);

/**
 * Wraps the current focus item in a new parent node and updates the tree structure in the markdown file.
 * Throws an error if the root node is the current focus item.
 * @param {string} newParentName - The name of the new parent node.
 * @param {string} path - The path to the markdown file.
 * @returns {Promise<TreeNode>} The updated tree structure.
 * @throws {Error} If the root node is the current focus item.
 */
export async function wrapCurrentItemInNewParentEffect(
  newParentName: string,
  path: string,
): Promise<TreeNode> {
  return await mutateTree(
    path,
    (t) => wrapCurrentItemInNewParent(t, newParentName),
    "wrapCurrentItemInNewParentEffect",
  );
}

/**
 * Moves a node to be the last child of a new parent node in the tree structure and updates the tree structure in the markdown file.
 *
 * @param {string} nodeKey - The key of the node to move.
 * @param {string} newParentKey - The key of the new parent node.
 * @param {string} path - The path to the markdown file.
 * @returns {Promise<TreeNode>} The updated tree structure.
 * @throws {Error} If the nodeKey is the same as the newParentKey.
 */
export async function moveNodeToNewParentEffect(
  nodeKey: string,
  newParentKey: string,
  path: string,
): Promise<TreeNode> {
  return await mutateTree(
    path,
    (t) => moveNodeToNewParent(t, nodeKey, newParentKey),
    "moveNodeToNewParentEffect",
  );
}

/**
 * Moves a node to a new parent using an already-loaded tree. Avoids a second file read when the caller already has the tree.
 * @param {string} path - Path to the markdown file.
 * @param {TreeNode} tree - Pre-read tree.
 * @param {string} nodeKey - Key of the node to move.
 * @param {string} newParentKey - Key of the new parent.
 * @returns {Promise<TreeNode>} The updated tree structure.
 */
export async function moveNodeToNewParentEffectWithTree(
  path: string,
  tree: TreeNode,
  nodeKey: string,
  newParentKey: string,
): Promise<TreeNode> {
  return await mutateTreeWithTree(
    path,
    tree,
    (t) => moveNodeToNewParent(t, nodeKey, newParentKey),
    "moveNodeToNewParentEffect",
  );
}

/**
 * Moves the focus to the parent of the current item in the tree structure.
 * If the current item is the root, the focus remains unchanged.
 * @param {string} path - The path to the markdown file.
 * @returns {Promise<TreeNode>} The updated tree structure.
 */
export const focusParentEffect = focusEffect("focusParentEffect", focusParent);

/**
 * Moves the focus to the first child of the current item in the tree structure.
 * If the current item has no children, the focus remains unchanged.
 * @param {string} path - The path to the markdown file.
 * @returns {Promise<TreeNode>} The updated tree structure.
 */
export const focusFirstChildEffect = focusEffect(
  "focusFirstChildEffect",
  focusFirstChild,
);
