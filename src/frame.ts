import { INDENT, MARKER } from "./consts.ts";

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
  const lines = input.split("\n");
  const stack: { node: TreeNode; indent: number }[] = [];
  let keyCounter = 0;
  let root: TreeNode | null = null;
  let deepestNodes: TreeNode[] = [];
  let maxDepth = -1;
  let prevSpaces = 0;

  for (const line of lines) {
    if (!line.trim()) continue;

    const spaces = line.search(/\S/);
    let indent = Math.ceil(spaces / INDENT.length); // Convert spaces to indentation level
    const isCurrent = line.endsWith(" " + MARKER);
    const name = line.trimStart().slice(2).replace(" " + MARKER, "");
    const newNode: TreeNode = {
      key: keyCounter.toString(),
      name,
      children: [],
      isCurrent,
    };
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

    // Track deepest nodes
    if (indent > maxDepth) {
      maxDepth = indent;
      deepestNodes = [newNode];
    } else if (indent === maxDepth) {
      deepestNodes.push(newNode);
    }

    prevSpaces = spaces;
  }

  if (!root) {
    throw new Error("Root node not found in the input content.");
  }

  // If no item is current, set the first deepest node as current
  const currentNode = stack.find(({ node }) => node.isCurrent);
  if (!currentNode && deepestNodes.length > 0) {
    deepestNodes[0].isCurrent = true;
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
    const prefix = INDENT.repeat(depth) + "- ";
    const marker = node.isCurrent ? " " + MARKER : "";
    result += `${prefix}${node.name}${marker}\n`;
    for (const child of node.children) {
      traverse(child, depth + 1);
    }
  }

  traverse(tree, 0);
  return result;
}

/**
 * Completes the current item in the tree, removing it and setting its parent as current.
 * @param {TreeNode} tree - The root node of the tree structure.
 * @returns {TreeNode} The updated tree structure.
 */
export function completeCurrentItem(tree: TreeNode): TreeNode {
  function traverse(node: TreeNode, parent: TreeNode | null): boolean {
    if (node.isCurrent) {
      if (parent) {
        parent.children = parent.children.filter((child) => child !== node);
        parent.isCurrent = true;
      }
      return true;
    }
    for (const child of node.children) {
      if (traverse(child, node)) {
        return true;
      }
    }
    return false;
  }

  traverse(tree, null);
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
 */
export function setCurrentItem(tree: TreeNode, key: string): TreeNode {
  let hasUnsetPrevious = false;
  let hasSetNew = false;

  function traverseAndSet(node: TreeNode): boolean {
    if (node.isCurrent) {
      node.isCurrent = false;
      hasUnsetPrevious = true;
    }
    if (node.key === key) {
      node.isCurrent = true;
      hasSetNew = true;
    }
    for (const child of node.children) {
      traverseAndSet(child);
      if (hasUnsetPrevious && hasSetNew) {
        return true;
      }
    }
    return hasUnsetPrevious && hasSetNew;
  }

  traverseAndSet(tree);
  return tree;
}

/**
 * Gets a list of items in the tree as strings.
 * @param {TreeNode} tree - The root node of the tree structure.
 * @returns {string[]} The list of items.
 */
export function getItemsList(tree: TreeNode): string[] {
  const items: string[] = [];

  function traverse(node: TreeNode, depth: number) {
    const indent = INDENT.repeat(depth);
    const marker = node.isCurrent ? " " + MARKER : "";
    items.push(`${indent}- ${node.name}${marker}`);
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
  const breadcrumbPath = breadcrumb.slice(1).join(" / "); // Exclude the root item
  if (!breadcrumbPath) {
    return `Focus: ${currentItemName}`;
  }
  return [breadcrumbPath, `Focus: ${currentItemName}`].join("\n");
}

/**
 * Retrieves the tree structure from the markdown file.
 * @param {string} path - The path to the markdown file.
 * @returns {Promise<TreeNode>} The root node of the tree structure.
 */
const getTree = async (path: string): Promise<TreeNode> => {
  const content = await readMarkdownFile(path);
  return deserialize(content);
};

/**
 * Writes the tree structure to the markdown file.
 * @param {TreeNode} tree - The root node of the tree structure.
 * @param {string} path - The path to the markdown file.
 */
const writeTree = async (tree: TreeNode, path: string): Promise<void> => {
  const serialized = serialize(tree);
  await writeMarkdownFile(serialized, path);
  return;
};

/**
 * Retrieves the list of items in the tree structure.
 * @param {string} path - The path to the markdown file.
 * @returns {Promise<string[]>} The list of items.
 */
export async function getItemsListEffect(path: string): Promise<string[]> {
  const tree = await getTree(path);
  return getItemsList(tree);
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
  return getCurrentItemBreadcrumb(tree);
}
