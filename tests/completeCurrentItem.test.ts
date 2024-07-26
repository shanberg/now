import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { completeCurrentItem } from "../src/operations/index.ts";

Deno.test("completeCurrentItem - previous sibling becomes current", () => {
  const initialTree = {
    key: "0",
    name: "Root Frame",
    isCurrent: false,
    children: [
      { key: "1", name: "Item 1", children: [], isCurrent: false },
      { key: "2", name: "Item 2", children: [], isCurrent: true },
      { key: "3", name: "Item 3", children: [], isCurrent: false },
    ],
  };

  const expectedTree = {
    key: "0",
    name: "Root Frame",
    isCurrent: false,
    children: [
      { key: "1", name: "Item 1", children: [], isCurrent: true },
      { key: "3", name: "Item 3", children: [], isCurrent: false },
    ],
  };

  const updatedTree = completeCurrentItem(initialTree);
  assertEquals(updatedTree, expectedTree);
});

Deno.test("completeCurrentItem - next sibling becomes current", () => {
  const initialTree = {
    key: "0",
    name: "Root Frame",
    isCurrent: false,
    children: [
      { key: "1", name: "Item 1", children: [], isCurrent: true },
      { key: "2", name: "Item 2", children: [], isCurrent: false },
      { key: "3", name: "Item 3", children: [], isCurrent: false },
    ],
  };

  const expectedTree = {
    key: "0",
    name: "Root Frame",
    isCurrent: false,
    children: [
      { key: "2", name: "Item 2", children: [], isCurrent: true },
      { key: "3", name: "Item 3", children: [], isCurrent: false },
    ],
  };

  const updatedTree = completeCurrentItem(initialTree);
  assertEquals(updatedTree, expectedTree);
});

Deno.test("completeCurrentItem - parent becomes current", () => {
  const initialTree = {
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
            isCurrent: true,
          },
        ],
      },
      { key: "3", name: "Item 2", children: [], isCurrent: false },
    ],
  };

  const expectedTree = {
    key: "0",
    name: "Root Frame",
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
  };

  const updatedTree = completeCurrentItem(initialTree);
  assertEquals(updatedTree, expectedTree);
});
