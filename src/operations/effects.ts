import { D } from "../consts.ts";
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
import { readMarkdownFile, writeMarkdownFile } from "./fileOperations.ts";
import { deserialize, serialize } from "./treeSerialization.ts";

/**
 * Retrieves the tree structure from the markdown file.
 * @param {string} path - The path to the markdown file.
 * @returns {Promise<TreeNode>} The root node of the tree structure.
 */
export const getTree = async (path: string): Promise<TreeNode> => {
  const content = await readMarkdownFile(path);
  const tree = deserialize(content);
  D && validateTree(tree, "getTree");
  return tree;
};

/**
 * Writes the tree structure to the markdown file.
 * @param {TreeNode} tree - The root node of the tree structure.
 * @param {string} path - The path to the markdown file.
 */
const writeTree = async (tree: TreeNode, path: string): Promise<void> => {
  const serialized = serialize(tree);
  D && validateTree(tree, "writeTree");
  await writeMarkdownFile(serialized, path);
  return;
};

/**
 * Validates the tree structure to ensure only one node is marked as current.
 * @param {TreeNode} tree - The root node of the tree structure.
 * @throws {Error} If multiple nodes are marked as current.
 */
export function validateTree(tree: TreeNode, caller = "validateTree"): void {
  let currentCount = 0;

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
 */
export async function addChildToCurrentItemEffect(
  newText: string,
  path: string,
): Promise<void> {
  const tree = await getTree(path);
  const newTree = addChildToCurrentItem(tree, newText);
  D && validateTree(newTree, "addChildToCurrentItemEffect");
  await writeTree(newTree, path);
  return;
}

/**
 * Adds a sequence of nested children to the current item in the tree structure.
 * The last item in the list will be the new current item.
 * @param {string} items - The comma-separated list of items to add.
 * @param {string} path - The path to the markdown file.
 */
export async function createNestedChildrenEffect(
  items: string,
  path: string,
): Promise<void> {
  const tree = await getTree(path);
  const newTree = createNestedChildren(tree, items);
  D && validateTree(newTree, "createNestedChildrenEffect");
  await writeTree(newTree, path);
  return;
}

/**
 * Adds a new sibling item after the current item in the tree structure.
 * @param {string} newText - The name of the new sibling item.
 * @param {string} path - The path to the markdown file.
 */
export async function addNextSiblingToCurrentItemEffect(
  newText: string,
  path: string,
): Promise<void> {
  const tree = await getTree(path);
  const newTree = addNextSiblingToCurrentItem(tree, newText);
  D && validateTree(newTree, "addNextSiblingToCurrentItemEffect");
  await writeTree(newTree, path);
  return;
}

/**
 * Completes the current item in the tree structure.
 * @param {string} path - The path to the markdown file.
 */
export async function completeCurrentItemEffect(path: string): Promise<void> {
  const tree = await getTree(path);
  const newTree = completeCurrentItem(tree);
  D && validateTree(newTree, "completeCurrentItemEffect");
  await writeTree(newTree, path);
  return;
}

/**
 * Sets the current item in the tree structure based on the provided key.
 * @param {string} key - The key of the item to set as current.
 * @param {string} path - The path to the markdown file.
 */
export async function setCurrentItemEffect(
  key: string,
  path: string,
): Promise<void> {
  const tree = await getTree(path);
  const newTree = setCurrentItem(tree, key);
  D && validateTree(newTree, "setCurrentItemEffect");
  await writeTree(newTree, path);
  return;
}

/**
 * Edits the name of the current item in the tree structure.
 * @param {string} newName - The new name for the current item.
 * @param {string} path - The path to the markdown file.
 */
export async function editCurrentItemNameEffect(
  newName: string,
  path: string,
): Promise<void> {
  const tree = await getTree(path);
  const newTree = editCurrentItemName(tree, newName);
  D && validateTree(tree, "editCurrentItemNameEffect");
  await writeTree(newTree, path);
  return;
}

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
export async function diveInEffect(path: string): Promise<TreeNode> {
  const tree = await getTree(path);
  const newTree = diveIn(tree);
  D && validateTree(newTree, "diveInEffect");
  await writeTree(newTree, path);
  return newTree;
}

/**
 * Changes focus to the next sibling item in the tree structure.
 * If the current item is the last sibling, it cycles to the first sibling.
 * If no siblings exist, the focus remains unchanged.
 * @param {string} path - The path to the markdown file.
 * @returns {Promise<TreeNode>} The updated tree structure.
 */
export async function focusNextSiblingEffect(path: string): Promise<TreeNode> {
  const tree = await getTree(path);
  const newTree = focusNextSibling(tree);
  D && validateTree(newTree, "focusNextSiblingEffect");
  await writeTree(newTree, path);
  return newTree;
}

/**
 * Changes focus to the previous sibling item in the tree structure.
 * If the current item is the first sibling, it cycles to the last sibling.
 * If no siblings exist, the focus remains unchanged.
 * @param {string} path - The path to the markdown file.
 * @returns {Promise<TreeNode>} The updated tree structure.
 */
export async function focusPreviousSiblingEffect(
  path: string,
): Promise<TreeNode> {
  const tree = await getTree(path);
  const newTree = focusPreviousSibling(tree);
  D && validateTree(newTree, "focusPreviousSiblingEffect");
  await writeTree(newTree, path);
  return newTree;
}

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
  const tree = await getTree(path);
  const newTree = wrapCurrentItemInNewParent(tree, newParentName);
  D && validateTree(newTree, "wrapCurrentItemInNewParentEffect");
  await writeTree(newTree, path);
  return newTree;
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
  const tree = await getTree(path);
  const newTree = moveNodeToNewParent(tree, nodeKey, newParentKey);
  D && validateTree(newTree, "moveNodeToNewParentEffect");
  await writeTree(newTree, path);
  return newTree;
}

/**
 * Moves the focus to the parent of the current item in the tree structure.
 * If the current item is the root, the focus remains unchanged.
 * @param {string} path - The path to the markdown file.
 * @returns {Promise<TreeNode>} The updated tree structure.
 */
export async function focusParentEffect(path: string): Promise<TreeNode> {
  const tree = await getTree(path);
  const newTree = focusParent(tree);
  D && validateTree(newTree, "focusParentEffect");
  await writeTree(newTree, path);
  return newTree;
}

/**
 * Moves the focus to the first child of the current item in the tree structure.
 * If the current item has no children, the focus remains unchanged.
 * @param {string} path - The path to the markdown file.
 * @returns {Promise<TreeNode>} The updated tree structure.
 */
export async function focusFirstChildEffect(path: string): Promise<TreeNode> {
  const tree = await getTree(path);
  const newTree = focusFirstChild(tree);
  D && validateTree(newTree, "focusFirstChildEffect");
  await writeTree(newTree, path);
  return newTree;
}
