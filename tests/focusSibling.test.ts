import {
    assertEquals,
  } from "https://deno.land/std@0.224.0/assert/mod.ts";
  import { setCurrentItem, focusNextSibling, focusPreviousSibling } from "../src/frame.ts";
  
  Deno.test("focusNextSibling - no siblings", () => {
    const tree: TreeNode = {
      key: "0",
      name: "Root",
      isCurrent: true,
      children: [],
    };
  
    const expected: TreeNode = {
      key: "0",
      name: "Root",
      isCurrent: true,
      children: [],
    };
  
    assertEquals(focusNextSibling(tree), expected);
  });
  
  Deno.test("focusNextSibling - multiple siblings", () => {
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
          isCurrent: true,
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
  
    assertEquals(focusNextSibling(tree), expected);
  });
  
  Deno.test("focusNextSibling - last sibling cycles to first", () => {
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

  assertEquals(focusNextSibling(tree), expected);
});

Deno.test("focusPreviousSibling - no siblings", () => {
  const tree: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: true,
    children: [],
  };

  const expected: TreeNode = {
    key: "0",
    name: "Root",
    isCurrent: true,
    children: [],
  };

  assertEquals(focusPreviousSibling(tree), expected);
});

Deno.test("focusPreviousSibling - multiple siblings", () => {
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
        isCurrent: true,
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

  assertEquals(focusPreviousSibling(tree), expected);
});

Deno.test("focusPreviousSibling - first sibling cycles to last", () => {
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

  assertEquals(focusPreviousSibling(tree), expected);
});

Deno.test("focusNextSibling - deeply nested nodes", () => {
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
            isCurrent: false,
            children: [
              {
                key: "3",
                name: "Great-Grandchild 1.1.1",
                isCurrent: true,
                children: [],
              },
              {
                key: "4",
                name: "Great-Grandchild 1.1.2",
                isCurrent: false,
                children: [],
              },
            ],
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
        children: [
          {
            key: "2",
            name: "Grandchild 1.1",
            isCurrent: false,
            children: [
              {
                key: "3",
                name: "Great-Grandchild 1.1.1",
                isCurrent: false,
                children: [],
              },
              {
                key: "4",
                name: "Great-Grandchild 1.1.2",
                isCurrent: true,
                children: [],
              },
            ],
          },
        ],
      },
    ],
  };

  assertEquals(focusNextSibling(tree), expected);
});

Deno.test("focusPreviousSibling - deeply nested nodes", () => {
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
            isCurrent: false,
            children: [
              {
                key: "3",
                name: "Great-Grandchild 1.1.1",
                isCurrent: false,
                children: [],
              },
              {
                key: "4",
                name: "Great-Grandchild 1.1.2",
                isCurrent: true,
                children: [],
              },
            ],
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
        children: [
          {
            key: "2",
            name: "Grandchild 1.1",
            isCurrent: false,
            children: [
              {
                key: "3",
                name: "Great-Grandchild 1.1.1",
                isCurrent: true,
                children: [],
              },
              {
                key: "4",
                name: "Great-Grandchild 1.1.2",
                isCurrent: false,
                children: [],
              },
            ],
          },
        ],
      },
    ],
  };

  assertEquals(focusPreviousSibling(tree), expected);
});


Deno.test("focusNextSibling - nodes at the same level under different parents", () => {
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
        {
          key: "3",
          name: "Child 2",
          isCurrent: false,
          children: [
            {
              key: "4",
              name: "Grandchild 2.1",
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
          children: [
            {
              key: "2",
              name: "Grandchild 1.1",
              isCurrent: true,
              children: [],
            },
          ],
        },
        {
          key: "3",
          name: "Child 2",
          isCurrent: false,
          children: [
            {
              key: "4",
              name: "Grandchild 2.1",
              isCurrent: false,
              children: [],
            },
          ],
        },
      ],
    };
  
    assertEquals(focusNextSibling(tree), expected);
  });
  
  Deno.test("focusPreviousSibling - nodes at the same level under different parents", () => {
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
        {
          key: "3",
          name: "Child 2",
          isCurrent: false,
          children: [
            {
              key: "4",
              name: "Grandchild 2.1",
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
          children: [
            {
              key: "2",
              name: "Grandchild 1.1",
              isCurrent: true,
              children: [],
            },
          ],
        },
        {
          key: "3",
          name: "Child 2",
          isCurrent: false,
          children: [
            {
              key: "4",
              name: "Grandchild 2.1",
              isCurrent: false,
              children: [],
            },
          ],
        },
      ],
    };
  
    assertEquals(focusPreviousSibling(tree), expected);
  });
  