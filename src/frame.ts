// @deno-types="../types.d.ts"
import { D, DATA_STR } from "./consts.ts";

// ```markdown
// - Root Frame
//   - Item 1
//     - Item 1.1
//     - Item 1.2 @
//   - Item 2
//     - Item 2.1
//     - Item 2.2
// ```

/**
 * Reads the content of a markdown file.
 * @param {string} path - The path to the markdown file.
 * @returns {Promise<string>} The content of the markdown file.
 */
async function readMarkdownFile(path: string): Promise<string> {
  if (!path) {
    throw new Error("Path is required");
  }
  try {
    return await Deno.readTextFile(path);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.log("File not found.");
      return "";
    } else {
      console.error("Error reading file:", error);
      return "";
    }
  }
}

/**
 * Writes content to a markdown file.
 * @param {string} content - The content to write to the file.
 * @param {string} path - The path to the markdown file.
 */
async function writeMarkdownFile(content: string, path: string): Promise<void> {
  try {
    await Deno.writeTextFile(path, content);
  } catch (error) {
    console.error("Error writing file:", error);
  }
}

/**
 * Deserializes a markdown string into a tree structure.
 * @param {string} input - The markdown string to deserialize.
 * @returns {TreeNode} The root node of the tree structure.
 */
export function deserialize(input: string): TreeNode {
  const lines = input.split(DATA_STR.lineSeparator);
  const stack: { node: TreeNode; indent: number }[] = [];
  let keyCounter = 0;
  let root: TreeNode | null = null;
  let hasFoundCurrent = false;
  let prevSpaces = 0;

  for (const line of lines) {
    if (!line.trim()) continue;

    const spaces = line.search(/\S/);
    let indent = Math.ceil(spaces / DATA_STR.indent.length); // Convert spaces to indentation level
    const isMarkedCurrent = line.endsWith(" " + DATA_STR.currentItemMarker);
    const name = line.trimStart().slice(DATA_STR.lineMarker.length).replace(
      " " + DATA_STR.currentItemMarker,
      "",
    );

    const newNode: TreeNode = {
      key: keyCounter.toString(),
      name,
      children: [],
      isCurrent: hasFoundCurrent ? false : isMarkedCurrent,
    };

    if (isMarkedCurrent) {
      if (hasFoundCurrent) {
        throw new Error(`Multiple items marked as current at line: "${line}"`);
      }
      hasFoundCurrent = true;
    }
    keyCounter++;

    if (indent === 0) {
      if (!root) {
        root = newNode;
      } else {
        throw new Error(`Multiple root nodes found at line: "${line}"`);
      }
      stack.push({ node: newNode, indent });
    } else {
      const prevIndent = stack[stack.length - 1].indent;

      // Normalize indentation if it's more than one level deeper, or more than one space
      if (spaces > prevSpaces || indent > prevIndent + 1) {
        indent = prevIndent + 1;
      }

      while (stack.length && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      if (stack.length === 0) {
        throw new Error(`Invalid indentation at line: "${line}"`);
      }

      stack[stack.length - 1].node.children.push(newNode);
      stack.push({ node: newNode, indent });
    }

    prevSpaces = spaces;
  }

  if (!root) {
    throw new Error("Root node not found in the input content.");
  }

  // If no item is current, set the first node as current
  if (!hasFoundCurrent) {
    root.isCurrent = true;
  }

  return root;
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

/**
 * Completes the current item in the tree, removing it and setting the appropriate new current item.
 * The new current item is determined as follows:
 * - If a previous sibling exists, that becomes the new current item.
 * - Otherwise, if a next sibling exists, that becomes the new current item.
 * - Otherwise, the parent becomes the new current item.
 * @param {TreeNode} tree - The root node of the tree structure.
 * @returns {TreeNode} The updated tree structure.
 */
export function completeCurrentItem(tree: TreeNode): TreeNode {
  function traverse(node: TreeNode): boolean {
    // Iterate over each child node
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];

      // Check if the current child is the current item
      if (child.isCurrent) {
        // Unset the current item
        child.isCurrent = false;

        // Determine the new current item
        let newCurrentItem: TreeNode | null = null;

        if (i > 0) {
          // Previous sibling exists
          newCurrentItem = node.children[i - 1];
        } else if (i < node.children.length - 1) {
          // Next sibling exists
          newCurrentItem = node.children[i + 1];
        } else if (node) {
          // No siblings, set node as current
          newCurrentItem = node;
        }

        // Set the new current item if found
        if (newCurrentItem) {
          newCurrentItem.isCurrent = true;
        }

        // Remove the current item from the children array
        node.children.splice(i, 1);

        return true; // Indicate that the current item was found and processed
      }

      // Recursively traverse the child nodes
      if (traverse(child)) {
        return true; // Stop traversal if the current item was found and processed
      }
    }
    return false; // Indicate that the current item was not found in this branch
  }

  // Start the traversal from the root node
  traverse(tree);

  return tree; // Return the updated tree structure
}

/**
 * Sets the current item to the first deepest child of the current item in the tree.
 * If the current item has no children, it remains the current item.
 * @param {TreeNode} tree - The root node of the tree structure.
 * @returns {TreeNode} The updated tree structure.
 */
export function diveIn(tree: TreeNode): TreeNode {
  function traverse(node: TreeNode): boolean {
    if (node.isCurrent) {
      node.isCurrent = false;
      let currentNode = node;

      while (currentNode.children.length > 0) {
        currentNode = currentNode.children[0];
      }

      currentNode.isCurrent = true;
      return true;
    }

    for (const child of node.children) {
      if (traverse(child)) {
        return true;
      }
    }

    return false;
  }

  traverse(tree);
  return tree;
}

/**
 * Adds a new child item to the current item in the tree.
 * @param {TreeNode} tree - The root node of the tree structure.
 * @param {string} newName - The name of the new child item.
 * @returns {TreeNode} The updated tree structure.
 */
export function addChildToCurrentItem(
  tree: TreeNode,
  newName: string,
): TreeNode {
  let keyCounter = 1;

  function traverseAndAdd(node: TreeNode): boolean {
    if (node.isCurrent) {
      node.isCurrent = false;
      const newChild: TreeNode = {
        key: keyCounter.toString(),
        name: newName,
        children: [],
        isCurrent: true,
      };
      keyCounter++;
      node.children.push(newChild);
      return true;
    }
    for (const child of node.children) {
      if (traverseAndAdd(child)) {
        return true;
      }
    }
    return false;
  }

  traverseAndAdd(tree);
  return tree;
}

/**
 * Adds a sequence of nested children and siblings to the current item in the tree.
 * @param {TreeNode} tree - The root node of the tree structure.
 * @param {string} items - The string of items to add, using slashes for nesting and commas for siblings.
 * @returns {TreeNode} The updated tree structure.
 */
export function createNestedChildren(tree: TreeNode, items: string): TreeNode {
  // Split the input into nested levels
  const levels = items.split("/").map((level) => level.trim());

  // Find the highest key value in the tree
  let maxKey = 0;
  function findMaxKey(node: TreeNode) {
    const key = parseInt(node.key, 10);
    if (key > maxKey) {
      maxKey = key;
    }
    for (const child of node.children) {
      findMaxKey(child);
    }
  }
  findMaxKey(tree);

  let keyCounter = maxKey + 1;

  function traverseAndAdd(node: TreeNode): boolean {
    if (node.isCurrent) {
      node.isCurrent = false;
      let currentNode = node;

      levels.forEach((level, levelIndex) => {
        const siblings = level.split(",").map((sibling) => sibling.trim());

        siblings.forEach((sibling, siblingIndex) => {
          const newChild: TreeNode = {
            key: keyCounter.toString(),
            name: sibling,
            children: [],
            isCurrent: levelIndex === levels.length - 1 &&
              siblingIndex === 0,
          };
          keyCounter++;
          currentNode.children.push(newChild);

          // If it's the last sibling, it becomes the current node for the next level
          if (siblingIndex === siblings.length - 1) {
            currentNode = newChild;
          }
        });
      });

      return true;
    }

    for (const child of node.children) {
      if (traverseAndAdd(child)) {
        return true;
      }
    }
    return false;
  }

  traverseAndAdd(tree);
  return tree;
}

/**
 * Adds a sibling item after the current item in the tree.
 * If the current item is the root, the new item is added to the top of the list of children of the root.
 * @param {TreeNode} tree - The root node of the tree structure.
 * @param {string} newName - The name of the new sibling item.
 * @returns {TreeNode} The updated tree structure.
 */
export function addNextSiblingToCurrentItem(
  tree: TreeNode,
  newName: string,
): TreeNode {
  // Find the highest key value in the tree
  let maxKey = 0;
  function findMaxKey(node: TreeNode) {
    const key = parseInt(node.key, 10);
    if (key > maxKey) {
      maxKey = key;
    }
    for (const child of node.children) {
      findMaxKey(child);
    }
  }
  findMaxKey(tree);

  let keyCounter = maxKey + 1;

  function traverseAndAdd(node: TreeNode): boolean {
    if (node.isCurrent && node === tree) {
      // If the current item is the root, add the new item to the top of the list of children of the root
      const newChild: TreeNode = {
        key: keyCounter.toString(),
        name: newName,
        children: [],
        isCurrent: false,
      };
      keyCounter++;
      node.children.unshift(newChild);
      return true;
    }

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child.isCurrent) {
        const newSibling: TreeNode = {
          key: keyCounter.toString(),
          name: newName,
          children: [],
          isCurrent: false,
        };
        keyCounter++;
        node.children.splice(i + 1, 0, newSibling);
        return true;
      }
      if (traverseAndAdd(child)) {
        return true;
      }
    }
    return false;
  }

  traverseAndAdd(tree);
  return tree;
}

/**
 * Edits the name of the current item in the tree.
 * @param {TreeNode} tree - The root node of the tree structure.
 * @param {string} newName - The new name for the current item.
 * @returns {TreeNode} The updated tree structure.
 */
export function editCurrentItemName(tree: TreeNode, newName: string): TreeNode {
  if (!newName.trim()) {
    console.error("Name cannot be empty.");
    return tree;
  }

  function traverseAndEdit(node: TreeNode): boolean {
    if (node.isCurrent) {
      node.name = newName;
      return true;
    }
    for (const child of node.children) {
      if (traverseAndEdit(child)) {
        return true;
      }
    }
    return false;
  }

  traverseAndEdit(tree);
  return tree;
}

/**
 * Sets the current item in the tree based on the provided key.
 * @param {TreeNode} tree - The root node of the tree structure.
 * @param {string} key - The key of the item to set as current.
 * @returns {TreeNode} The updated tree structure.
 * @throws {Error} If the key does not exist in the tree.
 */
export function setCurrentItem(tree: TreeNode, key: string): TreeNode {
  let keyFound = false;

  function traverseAndSet(node: TreeNode): TreeNode {
    const isCurrent = node.key === key;
    if (isCurrent) {
      keyFound = true;
    }

    return {
      ...node,
      isCurrent,
      children: node.children.map(traverseAndSet),
    };
  }

  const newTree = traverseAndSet(tree);

  if (!keyFound) {
    throw new Error(`Key "${key}" does not exist in the tree.`);
  }

  return newTree;
}

/**
 * Gets a list of items in the tree as strings.
 * @param {TreeNode} tree - The root node of the tree structure.
 * @returns {string[]} The list of items.
 */
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

/**
 * Gets an array of TreeNodes from the tree structure.
 * @param {TreeNode} tree - The root node of the tree structure.
 * @returns {TreeNode[]} The list of items.
 */
export function getNodesList(tree: TreeNode): TreeNode[] {
  const items: TreeNode[] = [];

  function traverse(node: TreeNode, depth: number) {
    items.push(node);
    for (const child of node.children) {
      traverse(child, depth + 1);
    }
  }

  traverse(tree, 0);
  return items;
}

/**
 * Gets the breadcrumb path of the current item in the tree.
 * @param {TreeNode} tree - The root node of the tree structure.
 * @returns {string} The breadcrumb path of the current item.
 */
export function getCurrentItemBreadcrumb(tree: TreeNode): string {
  let breadcrumb: string[] = [];
  let currentItemName = "";

  function traverse(node: TreeNode, path: string[]) {
    if (node.isCurrent) {
      breadcrumb = path;
      currentItemName = node.name;
      return true;
    }
    for (const child of node.children) {
      if (traverse(child, [...path, node.name])) {
        return true;
      }
    }
    return false;
  }

  traverse(tree, []);
  const breadcrumbPath = breadcrumb.join(" / ");
  if (!breadcrumbPath) {
    return `${currentItemName}`;
  }
  return [breadcrumbPath, currentItemName].join(" / ");
}

/**
 * Checks if the given node is a leaf node (i.e., it has no children).
 * @param {TreeNode} node - The node to check.
 * @returns {boolean} True if the node is a leaf, false otherwise.
 */
function isLeafNode(node: TreeNode): boolean {
  return node.children.length === 0;
}

/**
 * Gets detailed information about the current item in the tree,
 * including the breadcrumb path, focus string, whether it is a leaf node,
 * the depth of the current item, the number of siblings, the path to the root,
 * and the number of descendants.
 * @param {TreeNode} tree - The root node of the tree structure.
 * @returns {object} An object containing detailed information about the current item.
 */
export function getCurrentItemDetails(
  tree: TreeNode,
): {
  breadcrumbStr: string;
  focusStr: string;
  isLeaf: boolean;
  depth: number;
  siblingCount: number;
  descendantCount: number;
} {
  const breadcrumbPath = getCurrentItemBreadcrumb(tree);
  let isLeaf = false;
  let depth = 0;
  let siblingCount = 0;
  let descendantCount = 0;

  function traverse(
    node: TreeNode,
    currentDepth: number,
    path: TreeNode[],
  ): boolean {
    if (node.isCurrent) {
      isLeaf = isLeafNode(node);
      depth = currentDepth;
      siblingCount = path.length > 0
        ? path[path.length - 1].children.length - 1
        : 0;
      descendantCount = countDescendants(node);
      return true;
    }
    for (const child of node.children) {
      if (traverse(child, currentDepth + 1, [...path, node])) {
        return true;
      }
    }
    return false;
  }

  function countDescendants(node: TreeNode): number {
    let count = node.children.length;
    for (const child of node.children) {
      count += countDescendants(child);
    }
    return count;
  }

  traverse(tree, 0, []);

  if (breadcrumbPath.split(" / ").length > 1) {
    const breadcrumbStr = breadcrumbPath.slice(
      0,
      breadcrumbPath.lastIndexOf(" / "),
    );
    const focusStr = breadcrumbPath.slice(
      breadcrumbPath.lastIndexOf(" / ") + 3,
    );
    return {
      breadcrumbStr,
      focusStr,
      isLeaf,
      depth,
      siblingCount,
      descendantCount,
    };
  } else {
    const focusStr = breadcrumbPath;
    return {
      breadcrumbStr: "Focusing on",
      focusStr,
      isLeaf,
      depth,
      siblingCount,
      descendantCount,
    };
  }
}

/**
 * Changes focus to the next sibling item in the tree.
 * If the current item is the last sibling, it cycles to the first sibling.
 * If no siblings exist, the focus remains unchanged.
 * @param {TreeNode} tree - The root node of the tree structure.
 * @returns {TreeNode} The updated tree structure.
 */
export function focusNextSibling(tree: TreeNode): TreeNode {
  function traverse(node: TreeNode): boolean {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child.isCurrent) {
        child.isCurrent = false;
        const nextSiblingIndex = (i + 1) % node.children.length;
        node.children[nextSiblingIndex].isCurrent = true;
        return true;
      }
      if (traverse(child)) {
        return true;
      }
    }
    return false;
  }

  traverse(tree);
  return tree;
}

/**
 * Changes focus to the previous sibling item in the tree.
 * If the current item is the first sibling, it cycles to the last sibling.
 * If no siblings exist, the focus remains unchanged.
 * @param {TreeNode} tree - The root node of the tree structure.
 * @returns {TreeNode} The updated tree structure.
 */
export function focusPreviousSibling(tree: TreeNode): TreeNode {
  function traverse(node: TreeNode): boolean {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child.isCurrent) {
        child.isCurrent = false;
        const prevSiblingIndex = (i - 1 + node.children.length) %
          node.children.length;
        node.children[prevSiblingIndex].isCurrent = true;
        return true;
      }
      if (traverse(child)) {
        return true;
      }
    }
    return false;
  }

  traverse(tree);
  return tree;
}

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
export async function diveInEffect(
  path: string,
): Promise<TreeNode> {
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
