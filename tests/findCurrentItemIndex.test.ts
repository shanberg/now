import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { findCurrentItemIndex } from "../src/frame.ts";

Deno.test("findCurrentItemIndex - No current item", () => {
    const content =
        "- Root Frame\n- Frame 1\n  - Frame 1.1\n- Frame 2\n  - Frame 2.1";
    const lines = content.split("\n");
    const currentIndex = findCurrentItemIndex(lines);
    assertEquals(currentIndex, -1);
});

Deno.test("findCurrentItemIndex - Root item", () => {
    const content =
        "- Root Frame @\n- Frame 1\n  - Frame 1.1\n- Frame 2\n  - Frame 2.1";
    const lines = content.split("\n");
    const currentIndex = findCurrentItemIndex(lines);
    assertEquals(currentIndex, 0);
});

Deno.test("findCurrentItemIndex - 1st level, 1st item", () => {
    const content =
        "- Root Frame \n- Frame 1 @\n  - Frame 1.1\n- Frame 2\n  - Frame 2.1";
    const lines = content.split("\n");
    const currentIndex = findCurrentItemIndex(lines);
    assertEquals(currentIndex, 1);
});

Deno.test("findCurrentItemIndex - 1st level, 2nd item", () => {
    const content =
        "- Root Frame \n- Frame 1 \n  - Frame 1.1\n- Frame 2 @\n  - Frame 2.1";
    const lines = content.split("\n");
    const currentIndex = findCurrentItemIndex(lines);
    assertEquals(currentIndex, 3);
});

Deno.test("findCurrentItemIndex - leaf node, deepest item", () => {
    const content =
        "- Root Frame \n- Frame 1 \n  - Frame 1.1\n    - Frame 1.1.1 @\n- Frame 2\n  - Frame 2.1";
    const lines = content.split("\n");
    const currentIndex = findCurrentItemIndex(lines);
    assertEquals(currentIndex, 3);
});

Deno.test("findCurrentItemIndex - last item", () => {
    const content =
        "- Root Frame \n- Frame 1 \n  - Frame 1.1\n    - Frame 1.1.1\n- Frame 2\n  - Frame 2.1 @";
    const lines = content.split("\n");
    const currentIndex = findCurrentItemIndex(lines);
    assertEquals(currentIndex, 5);
});
