import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { getCurrentItemDetails } from "../src/operations/index.ts";

Deno.test("getCurrentItemDetails - single root node", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: true,
    children: [],
  };

  const expected = {
    breadcrumbStr: "Focusing on",
    focusStr: "Root",
    isLeaf: true,
    isRoot: true,
    depth: 0,
    siblingCount: 0,
    descendantCount: 0,
    key: "0",
  };

  assertEquals(getCurrentItemDetails(tree), expected);
});

Deno.test("getCurrentItemDetails - tree with multiple levels", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: false,
    children: [
      {
        key: "1",
        name: "Child 1",
        isCurrent: false,
        children: [
          {
            key: "2",
            name: "Grandchild 1.1",
            isCurrent: true,
            children: [],
          },
        ],
      },
    ],
  };

  const expected = {
    breadcrumbStr: "Root / Child 1",
    focusStr: "Grandchild 1.1",
    isLeaf: true,
    isRoot: false,
    depth: 2,
    siblingCount: 0,
    descendantCount: 0,
    key: "2",
  };

  assertEquals(getCurrentItemDetails(tree), expected);
});

Deno.test("getCurrentItemDetails - current item is a leaf", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: false,
    children: [
      {
        key: "1",
        name: "Child 1",
        isCurrent: true,
        children: [],
      },
    ],
  };

  const expected = {
    breadcrumbStr: "Root",
    focusStr: "Child 1",
    isLeaf: true,
    isRoot: false,
    depth: 1,
    siblingCount: 0,
    descendantCount: 0,
    key: "1",
  };

  assertEquals(getCurrentItemDetails(tree), expected);
});

Deno.test("getCurrentItemDetails - current item has children", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: false,
    children: [
      {
        key: "1",
        name: "Child 1",
        isCurrent: true,
        children: [
          {
            key: "2",
            name: "Grandchild 1.1",
            isCurrent: false,
            children: [],
          },
        ],
      },
    ],
  };

  const expected = {
    breadcrumbStr: "Root",
    focusStr: "Child 1",
    isLeaf: false,
    isRoot: false,
    depth: 1,
    siblingCount: 0,
    descendantCount: 1,
    key: "1",
  };

  assertEquals(getCurrentItemDetails(tree), expected);
});

Deno.test("getCurrentItemDetails - multiple siblings", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: false,
    children: [
      {
        key: "1",
        name: "Child 1",
        isCurrent: false,
        children: [],
      },
      {
        key: "2",
        name: "Child 2",
        isCurrent: true,
        children: [],
      },
      {
        key: "3",
        name: "Child 3",
        isCurrent: false,
        children: [],
      },
    ],
  };

  const expected = {
    breadcrumbStr: "Root",
    focusStr: "Child 2",
    isLeaf: true,
    isRoot: false,
    depth: 1,
    siblingCount: 2,
    descendantCount: 0,
    key: "2",
  };

  assertEquals(getCurrentItemDetails(tree), expected);
});

Deno.test("getCurrentItemDetails - deeply nested nodes", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: false,
    children: [
      {
        key: "1",
        name: "Child 1",
        isCurrent: false,
        children: [
          {
            key: "2",

            name: "Grandchild 1.1",
            isCurrent: false,
            children: [
              {
                key: "3",
                name: "Great-Grandchild 1.1.1",
                isCurrent: true,
                children: [],
              },
            ],
          },
        ],
      },
    ],
  };

  const expected = {
    breadcrumbStr: "Root / Child 1 / Grandchild 1.1",
    focusStr: "Great-Grandchild 1.1.1",
    isLeaf: true,
    isRoot: false,
    depth: 3,
    siblingCount: 0,
    descendantCount: 0,
    key: "3",
  };

  assertEquals(getCurrentItemDetails(tree), expected);
});
