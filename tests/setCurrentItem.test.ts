import { assertEquals, assertThrows } from "asserts";
import { setCurrentItem } from "src/frame.ts";

Deno.test("setCurrentItem - basic", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: false,
    children: [],
  };

  const expected: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: true,
    children: [],
  };

  assertEquals(setCurrentItem(tree, "0"), expected);
});

Deno.test("setCurrentItem - nested tree 1", () => {
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
      {
        key: "2",
        name: "Child 2",
        isCurrent: false,
        children: [],
      },
      {
        key: "3",
        name: "Child 3",
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
        isCurrent: false,
        children: [],
      },
      {
        key: "2",
        name: "Child 2",
        isCurrent: false,
        children: [],
      },
      {
        key: "3",
        name: "Child 3",
        isCurrent: true,
        children: [],
      },
    ],
  };

  assertEquals(setCurrentItem(tree, "3"), expected);
});

Deno.test("setCurrentItem - nested tree 2", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: false,
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
      {
        key: "3",
        name: "Child 3",
        isCurrent: true,
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
      {
        key: "3",
        name: "Child 3",
        isCurrent: false,
        children: [],
      },
    ],
  };

  assertEquals(setCurrentItem(tree, "1"), expected);
});

Deno.test("setCurrentItem - nested tree 3", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: false,
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
      {
        key: "3",
        name: "Child 3",
        isCurrent: false,
        children: [
          {
            key: "4",
            name: "Grandchild 1",
            isCurrent: false,
            children: [],
          },
          {
            key: "5",
            name: "Grandchild 2",
            isCurrent: false,
            children: [],
          },
          {
            key: "6",
            name: "Grandchild 3",
            isCurrent: true,
            children: [],
          },
        ],
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
        isCurrent: false,
        children: [],
      },
      {
        key: "2",
        name: "Child 2",
        isCurrent: false,
        children: [],
      },
      {
        key: "3",
        name: "Child 3",
        isCurrent: false,
        children: [
          {
            key: "4",
            name: "Grandchild 1",
            isCurrent: true,
            children: [],
          },
          {
            key: "5",
            name: "Grandchild 2",
            isCurrent: false,
            children: [],
          },
          {
            key: "6",
            name: "Grandchild 3",
            isCurrent: false,
            children: [],
          },
        ],
      },
    ],
  };

  assertEquals(setCurrentItem(tree, "4"), expected);
});

Deno.test("setCurrentItem - nested tree 4", () => {
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
        children: [
          {
            key: "4",
            name: "Grandchild 1",
            isCurrent: false,
            children: [],
          },
          {
            key: "5",
            name: "Grandchild 2",
            isCurrent: false,
            children: [],
          },
        ],
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
        isCurrent: false,
        children: [],
      },
      {
        key: "2",
        name: "Child 2",
        isCurrent: false,
        children: [
          {
            key: "4",
            name: "Grandchild 1",
            isCurrent: false,
            children: [],
          },
          {
            key: "5",
            name: "Grandchild 2",
            isCurrent: true,
            children: [],
          },
        ],
      },
    ],
  };

  assertEquals(setCurrentItem(tree, "5"), expected);
});

Deno.test("setCurrentItem - deeply nested tree", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: false,
    children: [
      {
        key: "1",
        name: "Child 1",
        isCurrent: false,
        children: [
          {
            key: "2",
            name: "Grandchild 1.1",
            isCurrent: true,
            children: [],
          },
        ],
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
        children: [
          {
            key: "2",
            name: "Grandchild 1.1",
            isCurrent: false,
            children: [],
          },
        ],
      },
    ],
  };

  assertEquals(setCurrentItem(tree, "0"), expected);
});

Deno.test("setCurrentItem - key does not exist", () => {
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

  assertThrows(
    () => setCurrentItem(tree, "2"),
    Error,
    'Key "2" does not exist in the tree.',
  );
});
