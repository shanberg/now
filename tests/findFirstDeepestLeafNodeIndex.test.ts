// @deno-types="../types.d.ts"
import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { findFirstDeepestLeafNodeIndex } from "../src/frame.ts";

Deno.test("findFirstDeepestLeafNodeIndex - single root frame", () => {
    const lines = [
        "- Root Frame @",
    ] as Line[];
    const result = findFirstDeepestLeafNodeIndex(lines);
    assertEquals(result, 0);
});

Deno.test("findFirstDeepestLeafNodeIndex - simple nested structure", () => {
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
    const result = findFirstDeepestLeafNodeIndex(lines);
    assertEquals(result, 4);
});

Deno.test("findFirstDeepestLeafNodeIndex - multiple deepest nodes", () => {
    const lines = [
        "- Root Frame @",
        "  - Item 1",
        "    - Item 1.1",
        "    - Item 1.2",
        "      - Item 1.2.1",
        "  - Item 2",
        "    - Item 2.1",
        "    - Item 2.2",
        "      - Item 2.2.1",
    ] as Line[];
    const result = findFirstDeepestLeafNodeIndex(lines);
    assertEquals(result, 4); // The last deepest node index
});

Deno.test("findFirstDeepestLeafNodeIndex - no nested items", () => {
    const lines = [
        "- Root Frame @",
        "  - Item 1",
        "  - Item 2",
    ] as Line[];
    const result = findFirstDeepestLeafNodeIndex(lines);
    assertEquals(result, 1);
});

Deno.test("findFirstDeepestLeafNodeIndex - empty list", () => {
    const lines = [] as Line[];
    const result = findFirstDeepestLeafNodeIndex(lines);
    assertEquals(result, -1);
});

Deno.test("findFirstDeepestLeafNodeIndex - irregular indentation", () => {
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
    const result = findFirstDeepestLeafNodeIndex(lines);
    assertEquals(result, 4);
});
