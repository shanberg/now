// @deno-types="../types.d.ts"
import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { completeCurrentItem } from "../src/frame.ts";

Deno.test("completeCurrentItem - basic", () => {
    const tree: TreeNode = {
        key: "foo",
        name: "foo",
        isCurrent: false,
        children: [
            {
                key: "bar",
                name: "bar",
                isCurrent: true,
                children: [
                    {
                        key: "baz",
                        name: "baz",
                        isCurrent: false,
                        children: [],
                    },
                ],
            },
        ],
    };

    const after: TreeNode = {
        key: "foo",
        name: "foo",
        isCurrent: true,
        children: [],
    };
    assertEquals(completeCurrentItem(tree), after);
});
