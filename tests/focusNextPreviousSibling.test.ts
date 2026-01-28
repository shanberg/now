import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  focusNextSibling,
  focusPreviousSibling,
} from "../src/operations/index.ts";
import { type TreeNode } from "../types.d.ts";

Deno.test("focusNextSibling - move to next sibling", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: false,
    children: [
      { key: "1", name: "Alpha", children: [], isCurrent: true },
      { key: "2", name: "Beta", children: [], isCurrent: false },
      { key: "3", name: "Gamma", children: [], isCurrent: false },
    ],
  };

  const updated = focusNextSibling(tree);

  assertEquals(updated.children![0].isCurrent, false);
  assertEquals(updated.children![1].isCurrent, true);
  assertEquals(updated.children![2].isCurrent, false);
});

Deno.test("focusNextSibling - wrap from last to first", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: false,
    children: [
      { key: "1", name: "Alpha", children: [], isCurrent: false },
      { key: "2", name: "Beta", children: [], isCurrent: false },
      { key: "3", name: "Gamma", children: [], isCurrent: true },
    ],
  };

  const updated = focusNextSibling(tree);

  assertEquals(updated.children![0].isCurrent, true);
  assertEquals(updated.children![1].isCurrent, false);
  assertEquals(updated.children![2].isCurrent, false);
});

Deno.test("focusNextSibling - only child, focus unchanged", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: false,
    children: [{ key: "1", name: "Only", children: [], isCurrent: true }],
  };

  const updated = focusNextSibling(tree);
  assertEquals(updated.children![0].isCurrent, true);
});

Deno.test("focusNextSibling - nested, move within siblings", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: false,
    children: [
      {
        key: "1",
        name: "Parent",
        isCurrent: false,
        children: [
          { key: "2", name: "A", children: [], isCurrent: true },
          { key: "3", name: "B", children: [], isCurrent: false },
        ],
      },
    ],
  };

  const updated = focusNextSibling(tree);
  assertEquals(updated.children![0].children![0].isCurrent, false);
  assertEquals(updated.children![0].children![1].isCurrent, true);
});

Deno.test("focusPreviousSibling - move to previous sibling", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: false,
    children: [
      { key: "1", name: "Alpha", children: [], isCurrent: false },
      { key: "2", name: "Beta", children: [], isCurrent: true },
      { key: "3", name: "Gamma", children: [], isCurrent: false },
    ],
  };

  const updated = focusPreviousSibling(tree);

  assertEquals(updated.children![0].isCurrent, true);
  assertEquals(updated.children![1].isCurrent, false);
});

Deno.test("focusPreviousSibling - wrap from first to last", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: false,
    children: [
      { key: "1", name: "Alpha", children: [], isCurrent: true },
      { key: "2", name: "Beta", children: [], isCurrent: false },
      { key: "3", name: "Gamma", children: [], isCurrent: false },
    ],
  };

  const updated = focusPreviousSibling(tree);

  assertEquals(updated.children![0].isCurrent, false);
  assertEquals(updated.children![1].isCurrent, false);
  assertEquals(updated.children![2].isCurrent, true);
});

Deno.test("focusPreviousSibling - only child, focus unchanged", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: false,
    children: [{ key: "1", name: "Only", children: [], isCurrent: true }],
  };

  const updated = focusPreviousSibling(tree);
  assertEquals(updated.children![0].isCurrent, true);
});

Deno.test("focusPreviousSibling - nested, move within siblings", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: false,
    children: [
      {
        key: "1",
        name: "Parent",
        isCurrent: false,
        children: [
          { key: "2", name: "A", children: [], isCurrent: false },
          { key: "3", name: "B", children: [], isCurrent: true },
        ],
      },
    ],
  };

  const updated = focusPreviousSibling(tree);
  assertEquals(updated.children![0].children![0].isCurrent, true);
  assertEquals(updated.children![0].children![1].isCurrent, false);
});
