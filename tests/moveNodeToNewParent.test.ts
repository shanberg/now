import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { type TreeNode } from "../types.d.ts";
import { moveNodeToNewParent } from "../src/operations/index.ts";

Deno.test("moveNodeToNewParent - move root child to another root child", () => {
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
        key: "2",
        name: "Child 2",
        isCurrent: false,
        children: [
          {
            key: "1",
            name: "Child 1",
            isCurrent: true,
            children: [],
          },
        ],
      },
    ],
  };

  assertEquals(moveNodeToNewParent(tree, "1", "2"), expected);
});

Deno.test(
  "moveNodeToNewParent - move nested child to another nested child",
  () => {
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
              key: "3",
              name: "Grandchild 1.1",
              isCurrent: true,
              children: [],
            },
          ],
        },
        {
          key: "2",
          name: "Child 2",
          isCurrent: false,
          children: [
            {
              key: "4",
              name: "Grandchild 2.1",
              isCurrent: false,
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
          children: [],
        },
        {
          key: "2",
          name: "Child 2",
          isCurrent: false,
          children: [
            {
              key: "4",
              name: "Grandchild 2.1",
              isCurrent: false,
              children: [],
            },
            {
              key: "3",
              name: "Grandchild 1.1",
              isCurrent: true,
              children: [],
            },
          ],
        },
      ],
    };

    assertEquals(moveNodeToNewParent(tree, "3", "2"), expected);
  },
);

Deno.test("moveNodeToNewParent - move node to itself", () => {
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

  assertThrows(
    () => {
      moveNodeToNewParent(tree, "1", "1");
    },
    Error,
    "The node to move cannot be the same as the new parent node.",
  );
});

Deno.test("moveNodeToNewParent - move node to non-existent parent", () => {
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

  const expected: TreeNode = { ...tree };

  assertEquals(moveNodeToNewParent(tree, "1", "999"), expected);
});

Deno.test("moveNodeToNewParent - deeply nested move", () => {
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
            key: "3",
            name: "Grandchild 1.1",
            isCurrent: true,
            children: [],
          },
        ],
      },
      {
        key: "2",
        name: "Child 2",
        isCurrent: false,
        children: [
          {
            key: "4",
            name: "Grandchild 2.1",
            isCurrent: false,
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
        children: [],
      },
      {
        key: "2",
        name: "Child 2",
        isCurrent: false,
        children: [
          {
            key: "4",
            name: "Grandchild 2.1",
            isCurrent: false,
            children: [
              {
                key: "3",
                name: "Grandchild 1.1",
                isCurrent: true,
                children: [],
              },
            ],
          },
        ],
      },
    ],
  };

  assertEquals(moveNodeToNewParent(tree, "3", "4"), expected);
});
