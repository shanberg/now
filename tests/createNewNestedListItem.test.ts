// @deno-types="../types.d.ts"
import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { createNewNestedListItem } from "../src/frame.ts";

Deno.test("createNewNestedListItem - add nested item", () => {
    const lines = [
        "- Root Frame",
        "  - Item 1 @",
    ] as Line[];
    const newText = "Item 1.1";
    const result = createNewNestedListItem(lines, newText);
    assertEquals(result, [
        "- Root Frame",
        "  - Item 1",
        "    - Item 1.1 @",
    ]);
});

Deno.test("createNewNestedListItem - add nested item to deeper level", () => {
    const lines = [
        "- Root Frame",
        "  - Item 1",
        "    - Item 1.1 @",
    ] as Line[];
    const newText = "Item 1.1.1";
    const result = createNewNestedListItem(lines, newText);
    assertEquals(result, [
        "- Root Frame",
        "  - Item 1",
        "    - Item 1.1",
        "      - Item 1.1.1 @",
    ]);
});

Deno.test("createNewNestedListItem - add nested item to root", () => {
    const lines = [
        "- Root Frame @",
    ] as Line[];
    const newText = "Item 1";
    const result = createNewNestedListItem(lines, newText);
    assertEquals(result, [
        "- Root Frame",
        "  - Item 1 @",
    ]);
});

Deno.test("createNewNestedListItem - add nested item to non-root item", () => {
    const lines = [
        "- Root Frame",
        "  - Item 1 @",
    ] as Line[];
    const newText = "Item 1.1";
    const result = createNewNestedListItem(lines, newText);
    assertEquals(result, [
        "- Root Frame",
        "  - Item 1",
        "    - Item 1.1 @",
    ]);
});

Deno.test("createNewNestedListItem - add nested item to deeper level with multiple branches", () => {
    const lines = [
        "- Root Frame",
        "  - Item 1",
        "    - Item 1.1 @",
        "  - Item 2",
        "    - Item 2.1",
    ] as Line[];
    const newText = "Item 1.1.1";
    const result = createNewNestedListItem(lines, newText);
    assertEquals(result, [
        "- Root Frame",
        "  - Item 1",
        "    - Item 1.1",
        "      - Item 1.1.1 @",
        "  - Item 2",
        "    - Item 2.1",
    ]);
});
