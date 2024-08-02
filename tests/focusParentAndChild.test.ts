import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { focusFirstChild, focusParent } from "../src/operations/index.ts";
import { type TreeNode } from "../types.d.ts";

Deno.test("focusParent - move focus to parent", () => {
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
    isCurrent: true,
    children: [
      {
        key: "1",
        name: "Child 1",
        isCurrent: false,
        children: [],
      },
    ],
  };

  assertEquals(focusParent(tree), expected);
});

Deno.test("focusParent - root node remains current", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: true,
    children: [
      {
        key: "1",
        name: "Child 1",
        isCurrent: false,
        children: [],
      },
    ],
  };

  const expected: TreeNode = { ...tree };

  assertEquals(focusParent(tree), expected);
});

Deno.test("focusFirstChild - move focus to first child", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: true,
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

  assertEquals(focusFirstChild(tree), expected);
});

Deno.test("focusFirstChild - no children, focus remains unchanged", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: true,
    children: [],
  };

  const expected: TreeNode = { ...tree };

  assertEquals(focusFirstChild(tree), expected);
});
