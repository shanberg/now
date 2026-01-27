/**
 * @fileoverview Tree manipulation: complete, dive, add child/sibling, edit, wrap, move, set current, focus navigation.
 */
import { type TreeNode } from "../../types.d.ts";

/**
 * Checks if the given node is a leaf node (i.e., it has no children).
 * @param {TreeNode} node - The node to check.
 * @returns {boolean} True if the node is a leaf, false otherwise.
 */
function isLeafNode(node: TreeNode): boolean {
  return node.children.length === 0;
}

/**
 * Returns the maximum numeric key among this node and all descendants.
 * @param {TreeNode} node - The node to start from.
 * @returns {number} The maximum key value among this node and all descendants.
 */
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
 * @param {TreeNode} node - Subtree to search.
 * @param {TreeNode | null} _container - Unused; kept for recursion signature.
 * @returns {{ parent: TreeNode, index: number } | null} Object with parent and index such that parent.children[index].isCurrent, or null.
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
 * Returns the leftmost leaf under the given node (or the node itself if it has no children).
 * @param {TreeNode} node - The node to start from.
 * @returns {TreeNode} The leftmost leaf node.
 */
function firstLeafOf(node: TreeNode): TreeNode {
  let n = node;
  while (n.children.length > 0) n = n.children[0];
  return n;
}

/**
 * Returns the rightmost leaf under the given node (or the node itself if it has no children).
 * @param {TreeNode} node - The node to start from.
 * @returns {TreeNode} The rightmost leaf node.
 */
function lastLeafOf(node: TreeNode): TreeNode {
  let n = node;
  while (n.children.length > 0) n = n.children[n.children.length - 1];
  return n;
}

/**
 * Returns the node that should become current after removing the item at removedIndex.
 * Prefer previous sibling's last leaf, else next sibling's first leaf, else parent.
 * @param {TreeNode} parent - Parent of the removed node.
 * @param {number} removedIndex - Index of the removed child.
 * @returns {TreeNode | null} The node to make current, or null.
 */
function selectNewCurrentAfterRemoval(
  parent: TreeNode,
  removedIndex: number,
): TreeNode | null {
  if (removedIndex > 0) return lastLeafOf(parent.children[removedIndex - 1]);
  if (removedIndex < parent.children.length - 1) {
    return firstLeafOf(parent.children[removedIndex + 1]);
  }
  return parent;
}

/**
 * Removes the current node from its parent and assigns focus to the next logical node
 * (previous sibling's last leaf, next sibling's first leaf, or parent).
 * @param ctx - Object with parent and index of the current node.
 * @returns {void}
 */
function removeCurrentAndAssignNext(ctx: {
  parent: TreeNode;
  index: number;
}): void {
  const { parent, index } = ctx;
  const current = parent.children[index];
  current.isCurrent = false;
  const newCurrent = isLeafNode(current)
    ? selectNewCurrentAfterRemoval(parent, index)
    : null;
  if (newCurrent) newCurrent.isCurrent = true;
  parent.children.splice(index, 1);
}

/**
 * Marks the current item as complete: removes it from the tree and moves focus to the next logical node.
 * @param {TreeNode} tree - The root of the tree.
 * @returns {TreeNode} The updated tree.
 */
export function completeCurrentItem(tree: TreeNode): TreeNode {
  const ctx = findCurrentNodeContext(tree, null);
  if (!ctx) {
    if (tree.children.length === 0) tree.isCurrent = true;
    return tree;
  }
  removeCurrentAndAssignNext(ctx);
  return tree;
}

/**
 * Sets the current item to the first deepest child of the current item in the tree.
 * If the current item has no children, it remains the current item.
 * @param {TreeNode} tree - The root node of the tree structure.
 * @returns {TreeNode} The updated tree structure.
 */
export function diveIn(tree: TreeNode): TreeNode {
  /** Finds current node and moves focus to its first deepest descendant. */
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

  /**
   * Finds current node and inserts a new child there.
   * @param node - Subtree to search.
   * @returns true if child was added.
   */
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
 * Appends nested levels under startNode from a parsed levels array, using keyCounter for new keys.
 * @param startNode - Node under which to add children.
 * @param levels - Array of level strings (each may contain comma-separated siblings).
 * @param keyCounter - Mutable counter used to assign keys to new nodes.
 * @returns {void}
 */
function addNestedLevelsUnder(
  startNode: TreeNode,
  levels: string[],
  keyCounter: { value: number },
): void {
  let currentNode = startNode;
  for (const level of levels) {
    const siblings = level.split(",").map((s) => s.trim());
    for (let i = 0; i < siblings.length; i++) {
      const isLastLevel = levels.indexOf(level) === levels.length - 1;
      const isFirstSibling = i === 0;
      const newChild: TreeNode = {
        key: keyCounter.value.toString(),
        name: siblings[i],
        children: [],
        isCurrent: isLastLevel && isFirstSibling,
      };
      keyCounter.value++;
      currentNode.children.push(newChild);
      if (i === siblings.length - 1) currentNode = newChild;
    }
  }
}

/**
 * Adds a sequence of nested children (and siblings) under the current item.
 * @param {TreeNode} tree - The root of the tree.
 * @param {string} items - Slash-separated levels; commas within a level create siblings.
 * @returns {TreeNode} The updated tree.
 */
export function createNestedChildren(tree: TreeNode, items: string): TreeNode {
  const levels = items.split("/").map((level) => level.trim());
  const keyCounter = { value: findMaxKey(tree) + 1 };

  /**
   * Finds current node and adds nested levels under it.
   * @param node - Subtree to search.
   * @returns true if current was found and levels were added.
   */
  function traverseAndAdd(node: TreeNode): boolean {
    if (!node.isCurrent) {
      for (const child of node.children) {
        if (traverseAndAdd(child)) return true;
      }
      return false;
    }
    node.isCurrent = false;
    addNestedLevelsUnder(node, levels, keyCounter);
    return true;
  }

  traverseAndAdd(tree);
  return tree;
}

/**
 * Inserts a new sibling after the current node among the given node's children; recurses to find current.
 * @param node - Subtree to search for the current node.
 * @param newName - Label for the new sibling.
 * @param keyCounter - Mutable counter for new keys.
 * @returns true if the sibling was inserted.
 */
function addSiblingAfterCurrentAmongChildren(
  node: TreeNode,
  newName: string,
  keyCounter: { value: number },
): boolean {
  for (let i = 0; i < node.children.length; i++) {
    if (node.children[i].isCurrent) {
      const newSibling: TreeNode = {
        key: keyCounter.value.toString(),
        name: newName,
        children: [],
        isCurrent: false,
      };
      keyCounter.value++;
      node.children.splice(i + 1, 0, newSibling);
      return true;
    }
    if (addSiblingAfterCurrentAmongChildren(node.children[i], newName, keyCounter)) {
      return true;
    }
  }
  return false;
}

/**
 * Adds a new sibling immediately after the current item.
 * @param {TreeNode} tree - The root of the tree.
 * @param {string} newName - Label for the new sibling.
 * @returns {TreeNode} The updated tree.
 */
export function addNextSiblingToCurrentItem(
  tree: TreeNode,
  newName: string,
): TreeNode {
  const keyCounter = { value: findMaxKey(tree) + 1 };

  if (tree.isCurrent) {
    const newChild: TreeNode = {
      key: keyCounter.value.toString(),
      name: newName,
      children: [],
      isCurrent: false,
    };
    keyCounter.value++;
    tree.children.unshift(newChild);
    return tree;
  }

  addSiblingAfterCurrentAmongChildren(tree, newName, keyCounter);
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

  /**
   * Finds current node and updates its name.
   * @param node - Subtree to search.
   * @returns true if name was updated.
   */
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
 * Replaces the current child of this node with a new parent containing that child.
 * The new parent gets a new key from keyCounter; the former current node stays current.
 * @param node - Subtree to search for the current node.
 * @param newParentName - Label for the new wrapping parent.
 * @param keyCounter - Mutable counter used to assign keys to new nodes.
 * @returns True if the current node was wrapped, false if current was not found under this subtree.
 */
function tryWrapCurrentChildHere(
  node: TreeNode,
  newParentName: string,
  keyCounter: { value: number },
): boolean {
  for (let i = 0; i < node.children.length; i++) {
    if (node.children[i].isCurrent) {
      const child = node.children[i];
      const newParent: TreeNode = {
        key: (keyCounter.value++).toString(),
        name: newParentName,
        isCurrent: false,
        children: [child],
      };
      node.children[i] = newParent;
      return true;
    }
    if (tryWrapCurrentChildHere(node.children[i], newParentName, keyCounter)) {
      return true;
    }
  }
  return false;
}

/**
 * Wraps the current node in a new parent node with the given name.
 * @param {TreeNode} tree - The root node of the tree structure.
 * @param {string} newParentName - The name for the new parent node.
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

  const keyCounter = { value: findMaxKey(tree) + 1 };
  tryWrapCurrentChildHere(tree, newParentName, keyCounter);
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

  /**
   * Recursively clones tree and sets isCurrent where key matches.
   * @param node - Subtree to transform.
   * @returns New tree with isCurrent set only where node.key === key.
   */
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
 * Finds a node by key and returns it with its parent.
 * @param node - Subtree to search.
 * @param key - Key to find.
 * @param parent - Parent of node (null when node is root).
 * @returns { node, parent } or null if not found or key is root.
 */
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

/**
 * Returns the node with the given key, or null if not found.
 * @param {TreeNode} node - Subtree to search.
 * @param {string} key - Key to find.
 * @returns {TreeNode | null} The node or null.
 */
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
  /**
   * Finds current child and moves focus to next sibling (wraps to first).
   * @param node - Subtree to search.
   * @returns true if focus was moved.
   */
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
  /**
   * Finds current child and moves focus to previous sibling (wraps to last).
   * @param node - Subtree to search.
   * @returns true if focus was moved.
   */
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
  /**
   * Finds current node and moves focus to its parent.
   * @param node - Subtree to search.
   * @param parent - Parent of node (null when node is root).
   * @returns true if focus was moved.
   */
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
  /**
   * Finds current node and moves focus to its first child.
   * @param node - Subtree to search.
   * @returns true if focus was moved.
   */
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
