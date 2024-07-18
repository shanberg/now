import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { setCurrentItem } from "../src/frame.ts";

Deno.test("setCurrentItem - set current item to a valid index", () => {
    const lines = [
        "- Root Frame",
        "  - Item 1",
        "    - Item 1.1",
        "  - Item 2 @",
        "    - Item 2.1",
    ];
    const indexToSet = 2; // Index of "Item 1.1"
    const result = setCurrentItem(lines, indexToSet);
    assertEquals(result, [
        "- Root Frame",
        "  - Item 1",
        "    - Item 1.1 @",
        "  - Item 2",
        "    - Item 2.1",
    ]);
});

Deno.test("setCurrentItem - set current item to the root item", () => {
    const lines = [
        "- Root Frame",
        "  - Item 1",
        "    - Item 1.1",
        "  - Item 2 @",
        "    - Item 2.1",
    ];
    const indexToSet = 0; // Index of "Root Frame"
    const result = setCurrentItem(lines, indexToSet);
    assertEquals(result, [
        "- Root Frame @",
        "  - Item 1",
        "    - Item 1.1",
        "  - Item 2",
        "    - Item 2.1",
    ]);
});

Deno.test("setCurrentItem - set current item to an invalid index (out of bounds)", () => {
    const lines = [
        "- Root Frame",
        "  - Item 1",
        "    - Item 1.1",
        "  - Item 2 @",
        "    - Item 2.1",
    ];
    const indexToSet = 10; // Invalid index
    const result = setCurrentItem(lines, indexToSet);
    assertEquals(result, lines); // No change should occur
});

Deno.test("setCurrentItem - set current item when there is already a current item marked", () => {
    const lines = [
        "- Root Frame",
        "  - Item 1 @",
        "    - Item 1.1",
        "  - Item 2",
        "    - Item 2.1",
    ];
    const indexToSet = 4; // Index of "Item 2.1"
    const result = setCurrentItem(lines, indexToSet);
    assertEquals(result, [
        "- Root Frame",
        "  - Item 1",
        "    - Item 1.1",
        "  - Item 2",
        "    - Item 2.1 @",
    ]);
});
