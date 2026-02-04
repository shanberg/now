import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  focusNextSibling,
  focusPreviousSibling,
} from "../src/operations/index.ts";
import { type TreeNode } from "../types.d.ts";

/** Root node with flat children; currentIndex is the child index that has isCurrent: true. */
function rootWithSiblings(
  childNames: string[],
  currentIndex: number,
): TreeNode {
  return {
    key: "0",
    name: "Root",
    isCurrent: false,
    children: childNames.map((name, i) => ({
      key: String(i + 1),
      name,
      children: [],
      isCurrent: i === currentIndex,
    })),
  };
}

/** Root > Parent > flat inner children; currentIndex is the inner child with isCurrent. */
function rootWithNestedSiblings(
  innerNames: string[],
  currentIndex: number,
): TreeNode {
  return {
    key: "0",
    name: "Root",
    isCurrent: false,
    children: [
      {
        key: "1",
        name: "Parent",
        isCurrent: false,
        children: innerNames.map((name, i) => ({
          key: String(i + 2),
          name,
          children: [],
          isCurrent: i === currentIndex,
        })),
      },
    ],
  };
}

/** Asserts exactly one child at expectedIndex has isCurrent; rest false. */
function expectCurrentAtFlat(
  node: TreeNode,
  expectedIndex: number,
): void {
  const children = node.children!;
  for (let i = 0; i < children.length; i++) {
    assertEquals(children[i].isCurrent, i === expectedIndex);
  }
}

/** Asserts exactly one inner child at expectedIndex has isCurrent. */
function expectCurrentAtNested(
  node: TreeNode,
  innerExpectedIndex: number,
): void {
  const inner = node.children![0].children!;
  for (let i = 0; i < inner.length; i++) {
    assertEquals(inner[i].isCurrent, i === innerExpectedIndex);
  }
}

Deno.test("focusNextSibling - move to next sibling", () => {
  const tree = rootWithSiblings(["Alpha", "Beta", "Gamma"], 0);
  expectCurrentAtFlat(focusNextSibling(tree), 1);
});

Deno.test("focusNextSibling - wrap from last to first", () => {
  const tree = rootWithSiblings(["Alpha", "Beta", "Gamma"], 2);
  expectCurrentAtFlat(focusNextSibling(tree), 0);
});

Deno.test("focusNextSibling - only child, focus unchanged", () => {
  const tree = rootWithSiblings(["Only"], 0);
  expectCurrentAtFlat(focusNextSibling(tree), 0);
});

Deno.test("focusNextSibling - nested, move within siblings", () => {
  const tree = rootWithNestedSiblings(["A", "B"], 0);
  expectCurrentAtNested(focusNextSibling(tree), 1);
});

Deno.test("focusPreviousSibling - move to previous sibling", () => {
  const tree = rootWithSiblings(["Alpha", "Beta", "Gamma"], 1);
  expectCurrentAtFlat(focusPreviousSibling(tree), 0);
});

Deno.test("focusPreviousSibling - wrap from first to last", () => {
  const tree = rootWithSiblings(["Alpha", "Beta", "Gamma"], 0);
  expectCurrentAtFlat(focusPreviousSibling(tree), 2);
});

Deno.test("focusPreviousSibling - only child, focus unchanged", () => {
  const tree = rootWithSiblings(["Only"], 0);
  expectCurrentAtFlat(focusPreviousSibling(tree), 0);
});

Deno.test("focusPreviousSibling - nested, move within siblings", () => {
  const tree = rootWithNestedSiblings(["A", "B"], 1);
  expectCurrentAtNested(focusPreviousSibling(tree), 0);
});
