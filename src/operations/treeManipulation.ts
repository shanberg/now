import { type TreeNode } from "../../types.d.ts";

/**
 * Checks if the given node is a leaf node (i.e., it has no children).
 * @param {TreeNode} node - The node to check.
 * @returns {boolean} True if the node is a leaf, false otherwise.
 */
function isLeafNode(node: TreeNode): boolean {
  return node.children.length === 0;
}

function findMaxKey(node: TreeNode): number {
  const key = parseInt(node.key, 10);
  let max = key;
  for (const child of node.children) {
    const childMax = findMaxKey(child);
    if (childMax > max) max = childMax;
  }
  return max;
}

/**
 * Finds the parent and index of the current node in the tree.
 * @returns { parent, index } such that parent.children[index].isCurrent, or null.
 */
function findCurrentNodeContext(
  node: TreeNode,
  _container: TreeNode | null,
): { parent: TreeNode; index: number } | null {
  for (let i = 0; i < node.children.length; i++) {
    if (node.children[i].isCurrent) return { parent: node, index: i };
    const found = findCurrentNodeContext(node.children[i], node);
    if (found) return found;
  }
  return null;
}

/**
 * Returns the node that should become current after removing the item at removedIndex.
 * Prefer previous sibling's last leaf, else next sibling's first leaf, else parent.
 */
function selectNewCurrentAfterRemoval(
  parent: TreeNode,
  removedIndex: number,
): TreeNode | null {
  if (removedIndex > 0) {
    let n: TreeNode = parent.children[removedIndex - 1];
    while (n.children.length > 0) n = n.children[0];
    return n;
  }
  if (removedIndex < parent.children.length - 1) {
    let n: TreeNode = parent.children[removedIndex + 1];
    while (n.children.length > 0) n = n.children[0];
    return n;
  }
  return parent;
}

export function completeCurrentItem(tree: TreeNode): TreeNode {
  const ctx = findCurrentNodeContext(tree, null);
  if (!ctx) {
    if (tree.children.length === 0) tree.isCurrent = true;
    return tree;
  }
  const { parent, index } = ctx;
  const current = parent.children[index];
  current.isCurrent = false;
  const wasLeaf = isLeafNode(current);
  const newCurrent = wasLeaf
    ? selectNewCurrentAfterRemoval(parent, index)
    : null;
  if (newCurrent) newCurrent.isCurrent = true;
  parent.children.splice(index, 1);
  return tree;
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
  const levels = items.split("/").map((level) => level.trim());
  let keyCounter = findMaxKey(tree) + 1;

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
            isCurrent: levelIndex === levels.length - 1 && siblingIndex === 0,
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
  let keyCounter = findMaxKey(tree) + 1;

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
 * Wraps the current focus item in a new parent node.
 * Throws an error if the root node is the current focus item.
 * @param {TreeNode} tree - The root node of the tree structure.
 * @param {string} newParentName - The name of the new parent node.
 * @returns {TreeNode} The updated tree structure.
 * @throws {Error} If the root node is the current focus item.
 */
export function wrapCurrentItemInNewParent(
  tree: TreeNode,
  newParentName: string,
): TreeNode {
  if (tree.isCurrent) {
    throw new Error("Root node cannot be wrapped in a new parent");
  }

  let keyCounter = findMaxKey(tree) + 1;

  function traverseAndWrap(node: TreeNode): boolean {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child.isCurrent) {
        const newParent: TreeNode = {
          key: (keyCounter++).toString(),
          name: newParentName,
          isCurrent: false,
          children: [child],
        };
        node.children[i] = newParent;
        return true;
      }
      if (traverseAndWrap(child)) {
        return true;
      }
    }
    return false;
  }

  traverseAndWrap(tree);
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

function findNodeWithParent(
  node: TreeNode,
  key: string,
  parent: TreeNode | null,
): { node: TreeNode; parent: TreeNode } | null {
  if (node.key === key) {
    if (parent === null) return null;
    return { node, parent };
  }
  for (const child of node.children) {
    const found = findNodeWithParent(child, key, node);
    if (found) return found;
  }
  return null;
}

function findNode(node: TreeNode, key: string): TreeNode | null {
  if (node.key === key) return node;
  for (const child of node.children) {
    const found = findNode(child, key);
    if (found) return found;
  }
  return null;
}

/**
 * Moves a node to be the last child of a new parent node in the tree.
 *
 * @param {TreeNode} tree - The root node of the tree structure.
 * @param {string} nodeKey - The key of the node to move.
 * @param {string} newParentKey - The key of the new parent node.
 * @returns {TreeNode} The updated tree structure.
 * @throws {Error} If the nodeKey is the same as the newParentKey.
 */
export function moveNodeToNewParent(
  tree: TreeNode,
  nodeKey: string,
  newParentKey: string,
): TreeNode {
  if (nodeKey === newParentKey) {
    throw new Error(
      "The node to move cannot be the same as the new parent node.",
    );
  }

  const moved = findNodeWithParent(tree, nodeKey, null);
  if (!moved) return tree;

  const newParentNode = findNode(tree, newParentKey);
  if (!newParentNode) return tree;

  const { node: nodeToMove, parent: parentOfNodeToMove } = moved;
  parentOfNodeToMove.children = parentOfNodeToMove.children.filter(
    (c) => c.key !== nodeKey,
  );
  newParentNode.children.push(nodeToMove);

  return tree;
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
 * Moves the focus to the parent of the current item in the tree.
 * If the current item is the root, the focus remains unchanged.
 * @param {TreeNode} tree - The root node of the tree structure.
 * @returns {TreeNode} The updated tree structure.
 */
export function focusParent(tree: TreeNode): TreeNode {
  function traverse(node: TreeNode, parent: TreeNode | null = null): boolean {
    if (node.isCurrent && parent) {
      node.isCurrent = false;
      parent.isCurrent = true;
      return true;
    }
    for (const child of node.children) {
      if (traverse(child, node)) {
        return true;
      }
    }
    return false;
  }

  traverse(tree);
  return tree;
}

/**
 * Moves the focus to the first child of the current item in the tree.
 * If the current item has no children, the focus remains unchanged.
 * @param {TreeNode} tree - The root node of the tree structure.
 * @returns {TreeNode} The updated tree structure.
 */
export function focusFirstChild(tree: TreeNode): TreeNode {
  function traverse(node: TreeNode): boolean {
    if (node.isCurrent && node.children.length > 0) {
      node.isCurrent = false;
      node.children[0].isCurrent = true;
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
