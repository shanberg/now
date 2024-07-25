import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { diveIn } from "../src/frame.ts";

Deno.test("diveIn - first deepest child becomes current", () => {
  const initialTree = {
    key: "0",
    name: "Root Frame",
    isCurrent: true,
    children: [
      {
        key: "1",
        name: "Item 1",
        isCurrent: false,
        children: [
          {
            key: "1.1",
            name: "Item 1.1",
            isCurrent: false,
            children: [
              {
                key: "1.1.1",
                name: "Item 1.1.1",
                children: [],
                isCurrent: false,
              },
            ],
          },
        ],
      },
      { key: "2", name: "Item 2", children: [], isCurrent: false },
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
            key: "1.1",
            name: "Item 1.1",
            isCurrent: false,
            children: [
              {
                key: "1.1.1",
                name: "Item 1.1.1",
                children: [],
                isCurrent: true,
              },
            ],
          },
        ],
      },
      { key: "2", name: "Item 2", children: [], isCurrent: false },
    ],
  };

  const updatedTree = diveIn(initialTree);
  assertEquals(updatedTree, expectedTree);
});

Deno.test("diveIn - first deepest child becomes current 2", () => {
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
            key: "1.1",
            name: "Item 1.1",
            isCurrent: false,
            children: [
              {
                key: "1.1.1",
                name: "Item 1.1.1",
                children: [],
                isCurrent: false,
              },
              {
                key: "1.1.2",
                name: "Item 1.1.2",
                children: [],
                isCurrent: false,
              },
              {
                key: "1.1.3",
                name: "Item 1.1.3",
                children: [],
                isCurrent: false,
              },
            ],
          },
          {
            key: "1.2",
            name: "Item 1.2",
            isCurrent: false,
            children: [
              {
                key: "1.2.1",
                name: "Item 1.2.1",
                children: [],
                isCurrent: false,
              },
              {
                key: "1.2.2",
                name: "Item 1.2.2",
                children: [],
                isCurrent: false,
              },
              {
                key: "1.2.3",
                name: "Item 1.2.3",
                children: [],
                isCurrent: false,
              },
            ],
          },
        ],
      },
      { key: "2", name: "Item 2", children: [], isCurrent: false },
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
            key: "1.1",
            name: "Item 1.1",
            isCurrent: false,
            children: [
              {
                key: "1.1.1",
                name: "Item 1.1.1",
                children: [],
                isCurrent: true,
              },
              {
                key: "1.1.2",
                name: "Item 1.1.2",
                children: [],
                isCurrent: false,
              },
              {
                key: "1.1.3",
                name: "Item 1.1.3",
                children: [],
                isCurrent: false,
              },
            ],
          },
          {
            key: "1.2",
            name: "Item 1.2",
            isCurrent: false,
            children: [
              {
                key: "1.2.1",
                name: "Item 1.2.1",
                children: [],
                isCurrent: false,
              },
              {
                key: "1.2.2",
                name: "Item 1.2.2",
                children: [],
                isCurrent: false,
              },
              {
                key: "1.2.3",
                name: "Item 1.2.3",
                children: [],
                isCurrent: false,
              },
            ],
          },
        ],
      },
      { key: "2", name: "Item 2", children: [], isCurrent: false },
    ],
  };

  const updatedTree = diveIn(initialTree);
  assertEquals(updatedTree, expectedTree);
});

Deno.test("diveIn - no children, current remains the same", () => {
  const initialTree = {
    key: "0",
    name: "Root Frame",
    isCurrent: true,
    children: [],
  };

  const expectedTree = {
    key: "0",
    name: "Root Frame",
    isCurrent: true,
    children: [],
  };

  const updatedTree = diveIn(initialTree);
  assertEquals(updatedTree, expectedTree);
});

Deno.test("diveIn - multiple children, first deepest child becomes current", () => {
  const initialTree = {
    key: "0",
    name: "Root Frame",
    isCurrent: true,
    children: [
      {
        key: "1",
        name: "Item 1",
        isCurrent: false,
        children: [
          {
            key: "1.1",
            name: "Item 1.1",
            isCurrent: false,
            children: [],
          },
        ],
      },
      {
        key: "2",
        name: "Item 2",
        isCurrent: false,
        children: [
          {
            key: "2.1",
            name: "Item 2.1",
            isCurrent: false,
            children: [
              {
                key: "2.1.1",
                name: "Item 2.1.1",
                children: [],
                isCurrent: false,
              },
            ],
          },
        ],
      },
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
            key: "1.1",
            name: "Item 1.1",
            isCurrent: true,
            children: [],
          },
        ],
      },
      {
        key: "2",
        name: "Item 2",
        isCurrent: false,
        children: [
          {
            key: "2.1",
            name: "Item 2.1",
            isCurrent: false,
            children: [
              {
                key: "2.1.1",
                name: "Item 2.1.1",
                children: [],
                isCurrent: false,
              },
            ],
          },
        ],
      },
    ],
  };

  const updatedTree = diveIn(initialTree);
  assertEquals(updatedTree, expectedTree);
});

Deno.test("diveIn - intermediate level with multiple siblings", () => {
  const initialTree = {
    key: "0",
    name: "Root Frame",
    isCurrent: true,
    children: [
      {
        key: "1",
        name: "Item 1",
        isCurrent: false,
        children: [
          {
            key: "1.1",
            name: "Item 1.1",
            isCurrent: false,
            children: [
              {
                key: "1.1.1",
                name: "Item 1.1.1",
                children: [],
                isCurrent: false,
              },
              {
                key: "1.1.2",
                name: "Item 1.1.2",
                children: [],
                isCurrent: false,
              },
            ],
          },
          {
            key: "1.2",
            name: "Item 1.2",
            isCurrent: false,
            children: [],
          },
        ],
      },
      { key: "2", name: "Item 2", children: [], isCurrent: false },
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
            key: "1.1",
            name: "Item 1.1",
            isCurrent: false,
            children: [
              {
                key: "1.1.1",
                name: "Item 1.1.1",
                children: [],
                isCurrent: true,
              },
              {
                key: "1.1.2",
                name: "Item 1.1.2",
                children: [],
                isCurrent: false,
              },
            ],
          },
          {
            key: "1.2",
            name: "Item 1.2",
            isCurrent: false,
            children: [],
          },
        ],
      },
      { key: "2", name: "Item 2", children: [], isCurrent: false },
    ],
  };

  const updatedTree = diveIn(initialTree);
  assertEquals(updatedTree, expectedTree);
});

Deno.test("diveIn - deepest level with multiple siblings", () => {
  const initialTree = {
    key: "0",
    name: "Root Frame",
    isCurrent: true,
    children: [
      {
        key: "1",
        name: "Item 1",
        isCurrent: false,
        children: [
          {
            key: "1.1",
            name: "Item 1.1",
            isCurrent: false,
            children: [
              {
                key: "1.1.1",
                name: "Item 1.1.1",
                children: [],
                isCurrent: false,
              },
              {
                key: "1.1.2",
                name: "Item 1.1.2",
                children: [],
                isCurrent: false,
              },
              {
                key: "1.1.3",
                name: "Item 1.1.3",
                children: [],
                isCurrent: false,
              },
            ],
          },
        ],
      },
      { key: "2", name: "Item 2", children: [], isCurrent: false },
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
            key: "1.1",
            name: "Item 1.1",
            isCurrent: false,
            children: [
              {
                key: "1.1.1",
                name: "Item 1.1.1",
                children: [],
                isCurrent: true,
              },
              {
                key: "1.1.2",
                name: "Item 1.1.2",
                children: [],
                isCurrent: false,
              },
              {
                key: "1.1.3",
                name: "Item 1.1.3",
                children: [],
                isCurrent: false,
              },
            ],
          },
        ],
      },
      { key: "2", name: "Item 2", children: [], isCurrent: false },
    ],
  };

  const updatedTree = diveIn(initialTree);
  assertEquals(updatedTree, expectedTree);
});
