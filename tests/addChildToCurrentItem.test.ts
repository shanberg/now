import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { addChildToCurrentItem } from "../src/operations/index.ts";

Deno.test("addChildToCurrentItem - basic", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: true,
    children: [],
  };

  const expected: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: false,
    children: [
      {
        key: "1",
        name: "New Child",
        isCurrent: true,
        children: [],
      },
    ],
  };

  assertEquals(addChildToCurrentItem(tree, "New Child"), expected);
});

Deno.test("addChildToCurrentItem - nested tree", () => {
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
      {
        key: "2",
        name: "Child 2",
        isCurrent: false,
        children: [],
      },
    ],
  };

  const expected: TreeNode = {
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
            key: "1",
            name: "New Child",
            isCurrent: true,
            children: [],
          },
        ],
      },
      {
        key: "2",
        name: "Child 2",
        isCurrent: false,
        children: [],
      },
    ],
  };

  assertEquals(addChildToCurrentItem(tree, "New Child"), expected);
});

Deno.test("addChildToCurrentItem - deeply nested tree", () => {
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

  const expected: TreeNode = {
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
                key: "1",
                name: "New Child",
                isCurrent: true,
                children: [],
              },
            ],
          },
        ],
      },
    ],
  };

  assertEquals(addChildToCurrentItem(tree, "New Child"), expected);
});

Deno.test("addChildToCurrentItem - no current item", () => {
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
    ],
  };
  const expected: TreeNode = {
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
    ],
  };

  assertEquals(addChildToCurrentItem(tree, "New Child"), expected);
});
