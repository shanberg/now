/**
 * @fileoverview Tree navigation: list items/nodes, breadcrumb, current-item details.
 */
import { DATA_STR } from "../consts.ts";
import { type TreeNode } from "../../types.d.ts";

/**
 * Gets a list of items in the tree as [displayString, key] pairs.
 * @param tree - The root node of the tree structure.
 * @returns Array of [displayString, key] for each node in depth-first order.
 */
export function getItemsList(tree: TreeNode): [string, string][] {
  const items: [string, string][] = [];

  /**
   * Recursively builds [displayString, key] for each node in depth-first order.
   * @param node - Subtree to walk.
   * @param depth - Current depth for indent.
   */
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
 * Gets an array of TreeNodes from the tree structure in depth-first order.
 * @param tree - The root node of the tree structure.
 * @returns Array of all nodes in depth-first order.
 */
export function getNodesList(tree: TreeNode): TreeNode[] {
  const items: TreeNode[] = [];

  /**
   * Collects every node in depth-first order.
   * @param node - Subtree to walk.
   * @param depth - Current depth (unused; for recursion).
   */
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
 * @param tree - The root node of the tree structure.
 * @returns Breadcrumb string (e.g. "Parent / Child / Current").
 */
export function getCurrentItemBreadcrumb(tree: TreeNode): string {
  let breadcrumb: string[] = [];
  let currentItemName = "";

  /**
   * Finds current node and records its path (ancestor names).
   * @param node - Subtree to search.
   * @param path - Ancestor names so far.
   * @returns true if current was found.
   */
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
 * Returns total number of descendants of the given node.
 * @param node - The node to count from.
 * @returns Total descendant count.
 */
function countDescendants(node: TreeNode): number {
  let count = node.children.length;
  for (const child of node.children) {
    count += countDescendants(child);
  }
  return count;
}

/**
 * Metadata for the currently focused node.
 * @typedef {Object} CurrentNodeMetadata
 * @property {boolean} isLeaf - Whether the node has no children.
 * @property {number} depth - Depth in the tree (0 = root).
 * @property {number} siblingCount - Number of siblings (excluding self).
 * @property {number} descendantCount - Total descendant count.
 * @property {string} key - Node key.
 */
type CurrentNodeMetadata = {
  isLeaf: boolean;
  depth: number;
  siblingCount: number;
  descendantCount: number;
  key: string;
};

/**
 * Builds metadata for a node in context (parent, depth).
 * @param node - The focused node.
 * @param depth - Depth in the tree.
 * @param parent - Parent node, or null if node is root.
 * @returns Metadata object with isLeaf, depth, siblingCount, descendantCount, key.
 */
function buildCurrentNodeMetadata(
  node: TreeNode,
  depth: number,
  parent: TreeNode | null,
): CurrentNodeMetadata {
  const siblingCount = parent
    ? parent.children.length - 1
    : 0;
  return {
    isLeaf: node.children.length === 0,
    depth,
    siblingCount,
    descendantCount: countDescendants(node),
    key: node.key,
  };
}

/**
 * Finds the current node and returns its leaf/root/sibling/descendant metadata.
 * @param tree - The root of the tree.
 * @returns Metadata object or null if no current node.
 */
function findCurrentNodeInfo(tree: TreeNode): CurrentNodeMetadata | null {
  let result: CurrentNodeMetadata | null = null;

  /**
   * Finds current node and records its metadata.
   * @param node - Subtree to search.
   * @param currentDepth - Depth of node.
   * @param parent - Parent of node (null when node is root).
   * @returns true if current was found.
   */
  function traverse(
    node: TreeNode,
    currentDepth: number,
    parent: TreeNode | null,
  ): boolean {
    if (node.isCurrent) {
      result = buildCurrentNodeMetadata(node, currentDepth, parent);
      return true;
    }
    for (const child of node.children) {
      if (traverse(child, currentDepth + 1, node)) return true;
    }
    return false;
  }

  traverse(tree, 0, null);
  return result;
}

/**
 * Splits a breadcrumb string into "path" and "focus" (last segment).
 * @param breadcrumbPath - Full breadcrumb string.
 * @returns { breadcrumbStr, focusStr }.
 */
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
 * the depth of the current item, the number of siblings, and the number of descendants.
 * @param tree - The root node of the tree structure.
 * @returns Object with breadcrumbStr, focusStr, isRoot, isLeaf, depth, siblingCount, descendantCount, key.
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
