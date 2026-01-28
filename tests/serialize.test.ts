import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { deserialize, serialize } from "../src/operations/index.ts";
import type { TreeNode } from "../types.d.ts";

Deno.test("serialize - root only", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: true,
    children: [],
  };

  const out = serialize(tree);

  assertEquals(out, "- Root @\n");
});

Deno.test("serialize - children and current marker", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: false,
    children: [
      { key: "1", name: "A", children: [], isCurrent: true },
      { key: "2", name: "B", children: [], isCurrent: false },
    ],
  };

  const out = serialize(tree);

  assertEquals(
    out,
    "- Root\n  - A @\n  - B\n",
  );
});

Deno.test("serialize - nested structure", () => {
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
          { key: "2", name: "Child", children: [], isCurrent: true },
        ],
      },
    ],
  };

  const out = serialize(tree);

  assertEquals(
    out,
    "- Root\n  - Parent\n    - Child @\n",
  );
});

/** Compares tree structure (name, isCurrent, children shape) ignoring keys. */
function structureEqual(a: TreeNode, b: TreeNode): boolean {
  if (a.name !== b.name || a.isCurrent !== b.isCurrent) return false;
  if (a.children.length !== b.children.length) return false;
  return a.children.every((c, i) => structureEqual(c, b.children[i]));
}

Deno.test("serialize/deserialize round-trip preserves structure", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: false,
    children: [
      { key: "1", name: "A", children: [], isCurrent: true },
      {
        key: "2",
        name: "B",
        isCurrent: false,
        children: [
          { key: "3", name: "B1", children: [], isCurrent: false },
        ],
      },
    ],
  };

  const roundTripped = deserialize(serialize(tree));

  assertEquals(structureEqual(roundTripped, tree), true);
});

Deno.test("deserialize(serialize(tree)) preserves names and current", () => {
  const tree: TreeNode = {
    key: "99",
    name: "X",
    isCurrent: true,
    children: [
      { key: "100", name: "Y", children: [], isCurrent: false },
    ],
  };

  const out = deserialize(serialize(tree));

  assertEquals(out.name, "X");
  assertEquals(out.isCurrent, true);
  assertEquals(out.children.length, 1);
  assertEquals(out.children[0].name, "Y");
  assertEquals(out.children[0].isCurrent, false);
});
