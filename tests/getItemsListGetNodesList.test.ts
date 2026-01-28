import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { getItemsList, getNodesList } from "../src/operations/index.ts";
import { type TreeNode } from "../types.d.ts";

Deno.test("getItemsList - root only", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: true,
    children: [],
  };

  const items = getItemsList(tree);

  assertEquals(items.length, 1);
  assertEquals(items[0], ["Root @", "0"]);
});

Deno.test("getItemsList - depth-first with indent and current marker", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: false,
    children: [
      { key: "1", name: "A", children: [], isCurrent: false },
      {
        key: "2",
        name: "B",
        isCurrent: true,
        children: [
          { key: "3", name: "B1", children: [], isCurrent: false },
        ],
      },
    ],
  };

  const items = getItemsList(tree);

  assertEquals(items.length, 4);
  assertEquals(items[0][0], "Root");
  assertEquals(items[0][1], "0");
  assertEquals(items[1], ["  A", "1"]);
  assertEquals(items[2], ["  B @", "2"]);
  assertEquals(items[3], ["    B1", "3"]);
});

Deno.test("getItemsList - no current marker when not current", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: false,
    children: [{ key: "1", name: "Child", children: [], isCurrent: false }],
  };

  const items = getItemsList(tree);

  assertEquals(items[0][0], "Root");
  assertEquals(items[1][0], "  Child");
});

Deno.test("getNodesList - root only", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: true,
    children: [],
  };

  const nodes = getNodesList(tree);

  assertEquals(nodes.length, 1);
  assertEquals(nodes[0], tree);
});

Deno.test("getNodesList - depth-first order", () => {
  const child1: TreeNode = {
    key: "1",
    name: "A",
    children: [],
    isCurrent: false,
  };
  const child2: TreeNode = {
    key: "2",
    name: "B",
    isCurrent: false,
    children: [
      { key: "3", name: "B1", children: [], isCurrent: false },
    ],
  };
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: false,
    children: [child1, child2],
  };

  const nodes = getNodesList(tree);

  assertEquals(nodes.length, 4);
  assertEquals(nodes[0].key, "0");
  assertEquals(nodes[1].key, "1");
  assertEquals(nodes[2].key, "2");
  assertEquals(nodes[3].key, "3");
});
