import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { deserialize } from "../src/operations/index.ts";
import type { TreeNode } from "../types.d.ts";

function assertDeserializesTo(input: string, expected: TreeNode): void {
  assertEquals(deserialize(input), expected);
}

Deno.test("deserialize - basic structure including current marker", () => {
  assertDeserializesTo(
    `
- Root
  - Child 1
    - Grandchild 1.1 @
    - Grandchild 1.2
  - Child 2
    - Grandchild 2.1
    - Grandchild 2.2
`,
    {
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
            {
              key: "3",
              name: "Grandchild 1.2",
              isCurrent: false,
              children: [],
            },
          ],
        },
        {
          key: "4",
          name: "Child 2",
          isCurrent: false,
          children: [
            {
              key: "5",
              name: "Grandchild 2.1",
              isCurrent: false,
              children: [],
            },
            {
              key: "6",
              name: "Grandchild 2.2",
              isCurrent: false,
              children: [],
            },
          ],
        },
      ],
    },
  );
});

Deno.test("deserialize - corrects invalid indentation", () => {
  assertDeserializesTo(
    `
- Root Focus
 - Child 1
  - Grandchild 1.1 @
`,
    {
      key: "0",
      name: "Root Focus",
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
    },
  );
});

Deno.test("deserialize - no root node", () => {
  const input = ``;

  assertThrows(
    () => deserialize(input),
    Error,
    "Root node not found in the input content.",
  );
});

Deno.test("deserialize - multiple current markers", () => {
  const input = `- Root
  - Child 1 @
  - Child 2 @`;
  assertThrows(
    () => deserialize(input),
    Error,
    'Multiple items marked as current at line: "  - Child 2 @"',
  );
});
