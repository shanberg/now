import { assertEquals } from "asserts";
import { createNestedChildren } from "src/frame.ts";

Deno.test("createNestedChildren - single item", () => {
  const initialTree = {
    key: "0",
    name: "Root Frame",
    isCurrent: false,
    children: [
      { key: "1", name: "Item 1", children: [], isCurrent: false },
      { key: "2", name: "Item 2", children: [], isCurrent: true },
    ],
  };

  const expectedTree = {
    key: "0",
    name: "Root Frame",
    isCurrent: false,
    children: [
      { key: "1", name: "Item 1", children: [], isCurrent: false },
      {
        key: "2",
        name: "Item 2",
        isCurrent: false,
        children: [
          {
            key: "3",
            name: "New Item",
            children: [],
            isCurrent: true,
          },
        ],
      },
    ],
  };

  const updatedTree = createNestedChildren(initialTree, "New Item");
  assertEquals(updatedTree, expectedTree);
});

Deno.test("createNestedChildren - multiple items", () => {
  const initialTree = {
    key: "0",
    name: "Root Frame",
    isCurrent: false,
    children: [
      { key: "1", name: "Item 1", children: [], isCurrent: false },
      { key: "2", name: "Item 2", children: [], isCurrent: true },
    ],
  };

  const expectedTree = {
    key: "0",
    name: "Root Frame",
    isCurrent: false,
    children: [
      { key: "1", name: "Item 1", children: [], isCurrent: false },
      {
        key: "2",
        name: "Item 2",
        isCurrent: false,
        children: [
          {
            key: "3",
            name: "New Item 1",
            isCurrent: false,
            children: [
              {
                key: "4",
                name: "New Item 2",
                isCurrent: false,
                children: [
                  {
                    key: "5",
                    name: "New Item 3",
                    children: [],
                    isCurrent: true,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  const updatedTree = createNestedChildren(
    initialTree,
    "New Item 1 / New Item 2 / New Item 3",
  );

  assertEquals(updatedTree, expectedTree);
});

Deno.test("createNestedChildren - existing children", () => {
  const initialTree = {
    key: "0",
    name: "Root Frame",
    isCurrent: false,
    children: [
      {
        key: "1",
        name: "Item 1",
        isCurrent: true,
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
            isCurrent: false,
          },
        ],
      },
      { key: "4", name: "Item 2", children: [], isCurrent: false },
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
            isCurrent: false,
          },
          {
            key: "5",
            name: "New Item 1",
            isCurrent: false,
            children: [
              {
                key: "6",
                name: "New Item 2",
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

  const updatedTree = createNestedChildren(
    initialTree,
    "New Item 1 / New Item 2",
  );
  assertEquals(updatedTree, expectedTree);
});

Deno.test("createNestedChildren - different levels of nesting", () => {
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
        isCurrent: false,
        children: [
          {
            key: "2",
            name: "Item 1.1",
            isCurrent: false,
            children: [
              {
                key: "4",
                name: "New Item 1",
                isCurrent: false,
                children: [
                  {
                    key: "5",
                    name: "New Item 2",
                    isCurrent: false,
                    children: [
                      {
                        key: "6",
                        name: "New Item 3",
                        children: [],
                        isCurrent: true,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      { key: "3", name: "Item 2", children: [], isCurrent: false },
    ],
  };

  const updatedTree = createNestedChildren(
    initialTree,
    "New Item 1 / New Item 2 / New Item 3",
  );
  assertEquals(updatedTree, expectedTree);
});

Deno.test("createNestedChildren - siblings", () => {
  const initialTree = {
    key: "0",
    name: "Root Frame",
    isCurrent: true,
    children: [
      { key: "1", name: "Item 1", children: [], isCurrent: false },
      { key: "2", name: "Item 2", children: [], isCurrent: false },
    ],
  };

  const expectedTree = {
    key: "0",
    name: "Root Frame",
    isCurrent: false,
    children: [
      { key: "1", name: "Item 1", children: [], isCurrent: false },
      { key: "2", name: "Item 2", children: [], isCurrent: false },
      { key: "3", name: "New Item 1", children: [], isCurrent: true },
      { key: "4", name: "New Item 2", children: [], isCurrent: false },
    ],
  };

  const updatedTree = createNestedChildren(
    initialTree,
    "New Item 1, New Item 2",
  );
  assertEquals(updatedTree, expectedTree);
});

Deno.test("createNestedChildren - nested and siblings", () => {
  const initialTree = {
    key: "0",
    name: "Root Frame",
    isCurrent: true,
    children: [
      { key: "1", name: "Item 1", children: [], isCurrent: false },
      { key: "2", name: "Item 2", children: [], isCurrent: false },
    ],
  };

  const expectedTree = {
    key: "0",
    name: "Root Frame",
    isCurrent: false,
    children: [
      { key: "1", name: "Item 1", children: [], isCurrent: false },
      { key: "2", name: "Item 2", children: [], isCurrent: false },
      {
        key: "3",
        name: "New Item 1",
        isCurrent: false,
        children: [
          {
            key: "4",
            name: "Child 1.1",
            children: [],
            isCurrent: false,
          },
          {
            key: "5",
            name: "Sibling 1.2",
            isCurrent: false,
            children: [
              {
                key: "6",
                name: "Grandchild 1.2.1",
                children: [],
                isCurrent: true,
              },
            ],
          },
        ],
      },
    ],
  };

  const updatedTree = createNestedChildren(
    initialTree,
    "New Item 1 / Child 1.1, Sibling 1.2 / Grandchild 1.2.1",
  );
  assertEquals(updatedTree, expectedTree);
});
