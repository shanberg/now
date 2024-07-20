// @deno-types="../types.d.ts"
import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { findParentIndex } from "../src/frame.ts";

Deno.test("findParentIndex - single root frame", () => {
    const lines = [
        "- Root Frame @",
    ] as Line[];
    const result = findParentIndex(lines, 0);
    assertEquals(result, 0);
});

Deno.test("findParentIndex - simple nested structure", () => {
    const lines = [
        "- Root Frame @",
        "  - Item 1",
        "    - Item 1.1",
        "    - Item 1.2",
        "      - Item 1.2.1",
        "  - Item 2",
        "    - Item 2.1",
        "    - Item 2.2",
        "    - Item 2.3",
    ] as Line[];
    const result = findParentIndex(lines, 4);
    assertEquals(result, 3);
});

Deno.test("findParentIndex - root item has no parent", () => {
    const lines = [
        "- Root Frame @",
        "  - Item 1",
        "    - Item 1.1",
    ] as Line[];
    const result = findParentIndex(lines, 0);
    assertEquals(result, 0);
});

Deno.test("findParentIndex - item with no parent", () => {
    const lines = [
        "- Root Frame @",
        "  - Item 1",
        "    - Item 1.1",
    ] as Line[];
    const result = findParentIndex(lines, 1);
    assertEquals(result, 0);
});

Deno.test("findParentIndex - irregular indentation", () => {
    const lines = [
        "- Root Frame @",
        " - Item 1",
        "   - Item 1.1",
        "    - Item 1.2",
        "      - Item 1.2.1",
        " - Item 2",
        "   - Item 2.1",
        "    - Item 2.2",
        "      - Item 2.2.1",
    ] as Line[];
    const result = findParentIndex(lines, 8);
    assertEquals(result, 7);
});
