/**
 * Checks if the given node is a leaf node (i.e., it has no children).
 * @param {TreeNode} node - The node to check.
 * @returns {boolean} True if the node is a leaf, false otherwise.
 */
function isLeafNode(node: TreeNode): boolean {
  return node.children.length === 0;
}

export function completeCurrentItem(tree: TreeNode): TreeNode {
  // Helper function to traverse the tree and find the current item

  // const D = tree.name === "Root x";
  const dbg = (x: any, args: any) => {
    if (tree.name === "Root") {
      true && console.log(x, args);
      console.log();
      true && alert([x, args].join("\n"));
      console.log();
    }
  };

  function traverse(node: TreeNode, parent: TreeNode | null = null): boolean {
    // Iterate over the children of the current node
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];

      // Check if the current child is the "current" item
      if (child.isCurrent) {
        // Mark the current item as no longer current
        child.isCurrent = false;

        // If the current item is a leaf node
        if (isLeafNode(child)) {
          let newCurrentItem: TreeNode | null = null;

          // If there is a previous sibling, make it the new current item
          if (i > 0) {
            dbg(child, "prev");
            newCurrentItem = node.children[i - 1];
            // Traverse down to the first leaf node in the previous sibling's subtree
            while (
              !isLeafNode(newCurrentItem) &&
              newCurrentItem.children.length > 0
            ) {
              newCurrentItem = newCurrentItem.children[0];
            }
            // If there is a next sibling, make it the new current item
          } else if (i < node.children.length - 1) {
            dbg(child, "next");
            newCurrentItem = node.children[i + 1];
            // Traverse down to the first leaf node in the next sibling's subtree
            while (
              !isLeafNode(newCurrentItem) &&
              newCurrentItem.children.length > 0
            ) {
              newCurrentItem = newCurrentItem.children[0];
            }
          } // If there are no siblings, make the parent the new current item
          else if (parent) {
            dbg(child, "parent");
            newCurrentItem = node;
          }

          // Mark the new current item as current
          if (newCurrentItem) {
            newCurrentItem.isCurrent = true;
          }

          // Remove the current item from its parent's children
          node.children.splice(i, 1);
          return true;
        } else {
          // If the current item is not a leaf node, just remove it
          node.children.splice(i, 1);
          return true;
        }
      }

      // Recursively traverse the child's subtree
      if (traverse(child, node)) {
        return true;
      }
    }

    return false;
  }

  // Start the traversal from the root of the tree
  if (!traverse(tree) && tree.children.length === 0) {
    // If no current item was found and the tree is empty, mark the root as current
    tree.isCurrent = true;
  }

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

  let nodeToMove: TreeNode | null = null;
  let parentOfNodeToMove: TreeNode | null = null;

  /**
   * Recursively finds the node to move and its parent.
   *
   * @param {TreeNode} node - The current node being checked.
   * @param {TreeNode | null} parent - The parent of the current node.
   * @returns {boolean} True if the node is found, otherwise false.
   */
  function findNodeAndParent(node: TreeNode, parent: TreeNode | null): boolean {
    if (node.key === nodeKey) {
      nodeToMove = node;
      parentOfNodeToMove = parent;
      return true;
    }
    for (const child of node.children) {
      if (findNodeAndParent(child, node)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Recursively finds a node by its key.
   *
   * @param {TreeNode} node - The current node being checked.
   * @param {string} key - The key of the node to find.
   * @returns {TreeNode | null} The node if found, otherwise null.
   */
  function findNodeByKey(node: TreeNode, key: string): TreeNode | null {
    if (node.key === key) {
      return node;
    }
    for (const child of node.children) {
      const result = findNodeByKey(child, key);
      if (result) {
        return result;
      }
    }
    return null;
  }

  findNodeAndParent(tree, null);

  if (!nodeToMove || !parentOfNodeToMove) {
    return tree; // Node to move not found
  }

  const newParentNode = findNodeByKey(tree, newParentKey);

  if (!newParentNode) {
    return tree; // New parent node not found
  }

  // Remove node from its current parent's children
  if (parentOfNodeToMove && (parentOfNodeToMove as TreeNode).children) {
    (parentOfNodeToMove as TreeNode).children = (
      parentOfNodeToMove as TreeNode
    ).children.filter((child: TreeNode) => child.key !== nodeKey);
  }

  // Add node to the new parent's children
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
