// @deno-types="../types.d.ts"
import { readJson } from "https://deno.land/x/jsonfile@1.0.0/mod.ts";
import { INDENT, MARKER, ROOT_FRAME } from "./consts.ts";

// ```markdown
// - Root Frame @
//   - Item 1
//     - Item 1.1
//     - Item 1.2
//
//   - Item 2
//     - Item 2.1
//     - Item 2.2
// ```

export async function getFilePath(): Promise<string> {
  const config = await readJson("./config.json") as Config;
  if (!config.filePath) {
    console.error("File path not found in config.json.");
    Deno.exit(1);
  }
  return config.filePath;
}

async function readMarkdownFile(): Promise<string> {
  const filePath = await getFilePath();
  try {
    return await Deno.readTextFile(filePath);
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

async function writeMarkdownFile(content: string): Promise<void> {
  const filePath = await getFilePath();
  try {
    await Deno.writeTextFile(filePath, content);
  } catch (error) {
    console.error("Error writing file:", error);
  }
}

interface TreeNode {
  key: string;
  name: string;
  children: TreeNode[];
  isCurrent: boolean;
}

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
    let indent = Math.ceil(spaces / 2); // Convert spaces to indentation level
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

export function serialize(tree: TreeNode): string {
  let result = "";

  function traverse(node: TreeNode, depth: number) {
    const prefix = "  ".repeat(depth) + "- ";
    const marker = node.isCurrent ? " " + MARKER : "";
    result += `${prefix}${node.name}${marker}\n`;
    for (const child of node.children) {
      traverse(child, depth + 1);
    }
  }

  traverse(tree, 0);
  return result;
}

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

export function getItemsList(tree: TreeNode): string[] {
  const items: string[] = [];

  function traverse(node: TreeNode, depth: number) {
    const indent = "  ".repeat(depth);
    const marker = node.isCurrent ? " @" : "";
    items.push(`${indent}- ${node.name}${marker}`);
    for (const child of node.children) {
      traverse(child, depth + 1);
    }
  }

  traverse(tree, 0);
  return items;
}

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

const getTree = async (): Promise<TreeNode> => {
  const content = await readMarkdownFile();
  return deserialize(content);
};

const writeTree = async (tree: TreeNode): Promise<void> => {
  const serialized = serialize(tree);
  await writeMarkdownFile(serialized);
  return;
};

// Exported function to get the list items
export async function getItemsListEffect(): Promise<string[]> {
  const tree = await getTree();
  return getItemsList(tree);
}

// Exported function to create a new nested list item
export async function addChildToCurrentItemEffect(
  newText: string,
): Promise<void> {
  const tree = await getTree();
  const newTree = addChildToCurrentItem(tree, newText);
  await writeTree(newTree);
  return;
}

// Exported function to complete the current item
export async function completeCurrentItemEffect(): Promise<void> {
  const tree = await getTree();
  const newTree = completeCurrentItem(tree);
  await writeTree(newTree);
  return;
}

// Exported function to set the current item
export async function setCurrentItemEffect(key: string): Promise<void> {
  const tree = await getTree();
  const newTree = setCurrentItem(tree, key);
  await writeTree(newTree);
  return;
}

// Exported function to edit the name of the current item
export async function editCurrentItemNameEffect(
  newName: string,
): Promise<void> {
  const tree = await getTree();
  const newTree = editCurrentItemName(tree, newName);
  await writeTree(newTree);
  return;
}

// Exported function to get the current item breadcrumb
export async function getCurrentItemBreadcrumbEffect(): Promise<string> {
  const tree = await getTree();
  return getCurrentItemBreadcrumb(tree);
}
