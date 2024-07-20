// @deno-types="../types.d.ts"
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { setCurrentItem } from "../src/frame.ts";

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

Deno.test("setCurrentItem - nested tree", () => {
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
        ],
    };

    assertEquals(setCurrentItem(tree, "2"), expected);
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
        ],
    };

    assertEquals(setCurrentItem(tree, "2"), expected);
});
