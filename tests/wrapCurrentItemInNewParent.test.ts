import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { wrapCurrentItemInNewParent } from "../src/frame.ts";

Deno.test("wrapCurrentItemInNewParent - root node as current focus", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: true,
    children: [],
  };

  assertThrows(
    () => {
      wrapCurrentItemInNewParent(tree, "New Parent");
    },
    Error,
    "Root node cannot be wrapped in a new parent",
  );
});

Deno.test("wrapCurrentItemInNewParent - single child node", () => {
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

  const expected: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: false,
    children: [
      {
        key: "2",
        name: "New Parent",
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

  assertEquals(wrapCurrentItemInNewParent(tree, "New Parent"), expected);
});

Deno.test("wrapCurrentItemInNewParent - deeply nested current item", () => {
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
            key: "3",
            name: "New Parent",
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
      },
    ],
  };

  assertEquals(wrapCurrentItemInNewParent(tree, "New Parent"), expected);
});

Deno.test("wrapCurrentItemInNewParent - multiple siblings", () => {
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
        key: "4",
        name: "New Parent",
        isCurrent: false,
        children: [
          {
            key: "2",
            name: "Child 2",
            isCurrent: true,
            children: [],
          },
        ],
      },
      {
        key: "3",
        name: "Child 3",
        isCurrent: false,
        children: [],
      },
    ],
  };

  assertEquals(wrapCurrentItemInNewParent(tree, "New Parent"), expected);
});
