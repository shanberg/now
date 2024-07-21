// @deno-types="../types.d.ts"
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { addNextSiblingToCurrentItem } from "../src/frame.ts";

Deno.test("addNextSiblingToCurrentItem - basic case", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root Frame",
    isCurrent: false,
    children: [
      { key: "1", name: "Item 1", children: [], isCurrent: false },
      { key: "2", name: "Item 2", children: [], isCurrent: true },
      { key: "3", name: "Item 3", children: [], isCurrent: false },
    ],
  };

  const updatedTree = addNextSiblingToCurrentItem(tree, "Item 2.1");

  const expectedTree: TreeNode = {
    key: "0",
    name: "Root Frame",
    isCurrent: false,
    children: [
      { key: "1", name: "Item 1", children: [], isCurrent: false },
      { key: "2", name: "Item 2", children: [], isCurrent: true },
      { key: "4", name: "Item 2.1", children: [], isCurrent: false },
      { key: "3", name: "Item 3", children: [], isCurrent: false },
    ],
  };

  assertEquals(updatedTree, expectedTree);
});

Deno.test("addNextSiblingToCurrentItem - nested case", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root Frame",
    isCurrent: false,
    children: [
      {
        key: "1",
        name: "Item 1",
        isCurrent: false,
        children: [
          {
            key: "2",
            name: "Item 1.1",
            children: [],
            isCurrent: false,
          },
          {
            key: "3",
            name: "Item 1.2",
            children: [],
            isCurrent: true,
          },
        ],
      },
      { key: "4", name: "Item 2", children: [], isCurrent: false },
    ],
  };

  const updatedTree = addNextSiblingToCurrentItem(tree, "Item 1.3");

  const expectedTree: TreeNode = {
    key: "0",
    name: "Root Frame",
    isCurrent: false,
    children: [
      {
        key: "1",
        name: "Item 1",
        isCurrent: false,
        children: [
          {
            key: "2",
            name: "Item 1.1",
            children: [],
            isCurrent: false,
          },
          {
            key: "3",
            name: "Item 1.2",
            children: [],
            isCurrent: true,
          },
          {
            key: "5",
            name: "Item 1.3",
            children: [],
            isCurrent: false,
          },
        ],
      },
      { key: "4", name: "Item 2", children: [], isCurrent: false },
    ],
  };

  assertEquals(updatedTree, expectedTree);
});

Deno.test("addNextSiblingToCurrentItem - multiple levels", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root Frame",
    isCurrent: false,
    children: [
      {
        key: "1",
        name: "Item 1",
        isCurrent: false,
        children: [
          {
            key: "2",
            name: "Item 1.1",
            isCurrent: false,
            children: [
              {
                key: "3",
                name: "Item 1.1.1",
                children: [],
                isCurrent: true,
              },
            ],
          },
        ],
      },
      { key: "4", name: "Item 2", children: [], isCurrent: false },
    ],
  };

  const updatedTree = addNextSiblingToCurrentItem(tree, "Item 1.1.2");

  const expectedTree: TreeNode = {
    key: "0",
    name: "Root Frame",
    isCurrent: false,
    children: [
      {
        key: "1",
        name: "Item 1",
        isCurrent: false,
        children: [
          {
            key: "2",
            name: "Item 1.1",
            isCurrent: false,
            children: [
              {
                key: "3",
                name: "Item 1.1.1",
                children: [],
                isCurrent: true,
              },
              {
                key: "5",
                name: "Item 1.1.2",
                children: [],
                isCurrent: false,
              },
            ],
          },
        ],
      },
      { key: "4", name: "Item 2", children: [], isCurrent: false },
    ],
  };

  assertEquals(updatedTree, expectedTree);
});

Deno.test("addNextSiblingToCurrentItem - root level", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root Frame",
    isCurrent: true,
    children: [
      { key: "1", name: "Item 1", children: [], isCurrent: false },
      { key: "2", name: "Item 2", children: [], isCurrent: false },
    ],
  };

  const updatedTree = addNextSiblingToCurrentItem(tree, "Root Frame 2");

  const expectedTree: TreeNode = {
    key: "0",
    name: "Root Frame",
    isCurrent: true,
    children: [
      { key: "3", name: "Root Frame 2", children: [], isCurrent: false },
      { key: "1", name: "Item 1", children: [], isCurrent: false },
      { key: "2", name: "Item 2", children: [], isCurrent: false },
    ],
  };

  assertEquals(updatedTree, expectedTree);
});
