import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { editCurrentItemName } from "../src/operations/index.ts";
import { type TreeNode } from "../types.d.ts";

Deno.test("editCurrentItemName - renames current at root", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: true,
    children: [],
  };

  const updated = editCurrentItemName(tree, "Renamed Root");

  assertEquals(updated.name, "Renamed Root");
  assertEquals(updated.isCurrent, true);
});

Deno.test("editCurrentItemName - renames current when nested", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: false,
    children: [
      { key: "1", name: "Child 1", children: [], isCurrent: false },
      { key: "2", name: "Child 2", children: [], isCurrent: true },
      { key: "3", name: "Child 3", children: [], isCurrent: false },
    ],
  };

  const updated = editCurrentItemName(tree, "Renamed Child 2");

  assertEquals(updated.children![1].name, "Renamed Child 2");
  assertEquals(updated.children![1].isCurrent, true);
});

Deno.test("editCurrentItemName - empty newName returns tree unchanged", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: true,
    children: [],
  };

  const updated = editCurrentItemName(tree, "   ");
  assertEquals(updated.name, "Root");
  assertEquals(editCurrentItemName(tree, "").name, "Root");
});

Deno.test("editCurrentItemName - no current item returns tree unchanged", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: false,
    children: [
      { key: "1", name: "Child 1", children: [], isCurrent: false },
      { key: "2", name: "Child 2", children: [], isCurrent: false },
    ],
  };

  const updated = editCurrentItemName(tree, "Should Not Change");
  assertEquals(updated.children![0].name, "Child 1");
  assertEquals(updated.children![1].name, "Child 2");
});
