import { DATA_STR } from "../consts.ts";
import { type TreeNode } from "../../types.d.ts";

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

function countDescendants(node: TreeNode): number {
  let count = node.children.length;
  for (const child of node.children) {
    count += countDescendants(child);
  }
  return count;
}

function findCurrentNodeInfo(tree: TreeNode): {
  isLeaf: boolean;
  depth: number;
  siblingCount: number;
  descendantCount: number;
  key: string;
} | null {
  let result: {
    isLeaf: boolean;
    depth: number;
    siblingCount: number;
    descendantCount: number;
    key: string;
  } | null = null;

  function traverse(
    node: TreeNode,
    currentDepth: number,
    path: TreeNode[],
  ): boolean {
    if (node.isCurrent) {
      result = {
        isLeaf: node.children.length === 0,
        depth: currentDepth,
        siblingCount: path.length > 0
          ? path[path.length - 1].children.length - 1
          : 0,
        descendantCount: countDescendants(node),
        key: node.key,
      };
      return true;
    }
    for (const child of node.children) {
      if (traverse(child, currentDepth + 1, [...path, node])) return true;
    }
    return false;
  }

  traverse(tree, 0, []);
  return result;
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

/**
 * Gets detailed information about the current item in the tree,
 * including the breadcrumb path, focus string, whether it is a leaf node,
 * the depth of the current item, the number of siblings, the path to the root,
 * and the number of descendants.
 * @param {TreeNode} tree - The root node of the tree structure.
 * @returns {object} An object containing detailed information about the current item.
 */
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
  const breadcrumbPath = getCurrentItemBreadcrumb(tree);
  const nodeInfo = findCurrentNodeInfo(tree);
  const { breadcrumbStr, focusStr } = splitBreadcrumbPath(breadcrumbPath);

  if (!nodeInfo) {
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
    isRoot: nodeInfo.depth === 0,
    isLeaf: nodeInfo.isLeaf,
    depth: nodeInfo.depth,
    siblingCount: nodeInfo.siblingCount,
    descendantCount: nodeInfo.descendantCount,
    key: nodeInfo.key,
  };
}
