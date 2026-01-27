import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { completeCurrentItem } from "../src/operations/index.ts";
import type { TreeNode } from "../types.d.ts";

function assertComplete(
  initialTree: TreeNode,
  expectedTree: TreeNode,
): void {
  assertEquals(completeCurrentItem(initialTree), expectedTree);
}

Deno.test("completeCurrentItem - previous sibling becomes current", () => {
  assertComplete(
    {
      key: "0",
      name: "Root Focus",
      isCurrent: false,
      children: [
        { key: "1", name: "Item 1", children: [], isCurrent: false },
        { key: "2", name: "Item 2", children: [], isCurrent: true },
        { key: "3", name: "Item 3", children: [], isCurrent: false },
      ],
    },
    {
      key: "0",
      name: "Root Focus",
      isCurrent: false,
      children: [
        { key: "1", name: "Item 1", children: [], isCurrent: true },
        { key: "3", name: "Item 3", children: [], isCurrent: false },
      ],
    },
  );
});

Deno.test("completeCurrentItem - next sibling becomes current", () => {
  assertComplete(
    {
      key: "0",
      name: "Root Focus",
      isCurrent: false,
      children: [
        { key: "1", name: "Item 1", children: [], isCurrent: true },
        { key: "2", name: "Item 2", children: [], isCurrent: false },
        { key: "3", name: "Item 3", children: [], isCurrent: false },
      ],
    },
    {
      key: "0",
      name: "Root Focus",
      isCurrent: false,
      children: [
        { key: "2", name: "Item 2", children: [], isCurrent: true },
        { key: "3", name: "Item 3", children: [], isCurrent: false },
      ],
    },
  );
});

Deno.test("completeCurrentItem - parent becomes current", () => {
  assertComplete(
    {
      key: "0",
      name: "Root Focus",
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
              isCurrent: true,
            },
          ],
        },
        { key: "3", name: "Item 2", children: [], isCurrent: false },
      ],
    },
    {
      key: "0",
      name: "Root Focus",
      isCurrent: false,
      children: [
        {
          key: "1",
          name: "Item 1",
          children: [],
          isCurrent: true,
        },
        { key: "3", name: "Item 2", children: [], isCurrent: false },
      ],
    },
  );
});
