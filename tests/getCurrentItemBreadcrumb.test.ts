import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { getCurrentItemBreadcrumb } from "../src/frame.ts";

Deno.test("getCurrentItemBreadcrumb - current item at root", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: true,
    children: [],
  };

  const expected = "Root";
  assertEquals(getCurrentItemBreadcrumb(tree), expected);
});

Deno.test("getCurrentItemBreadcrumb - current item at first level", () => {
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

  const expected = "Root / Child 1";
  assertEquals(getCurrentItemBreadcrumb(tree), expected);
});

Deno.test("getCurrentItemBreadcrumb - current item at second level", () => {
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

  const expected = "Root / Child 1 / Grandchild 1.1";
  assertEquals(getCurrentItemBreadcrumb(tree), expected);
});

Deno.test("getCurrentItemBreadcrumb - no current item", () => {
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

  const expected = "";
  assertEquals(getCurrentItemBreadcrumb(tree), expected);
});

Deno.test("getCurrentItemBreadcrumb - multiple levels with current item", () => {
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
      {
        key: "4",
        name: "Child 2",
        isCurrent: false,
        children: [],
      },
    ],
  };

  const expected = "Root / Child 1 / Grandchild 1.1 / Great-Grandchild 1.1.1";
  assertEquals(getCurrentItemBreadcrumb(tree), expected);
});

Deno.test("getCurrentItemBreadcrumb - current item with siblings", () => {
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
            children: [],
          },
          {
            key: "3",
            name: "Grandchild 1.2",
            isCurrent: true,
            children: [],
          },
        ],
      },
    ],
  };

  const expected = "Root / Child 1 / Grandchild 1.2";
  assertEquals(getCurrentItemBreadcrumb(tree), expected);
});
