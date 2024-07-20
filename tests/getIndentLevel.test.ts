// @deno-types="../types.d.ts"
import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { assertThrows } from "https://deno.land/std@0.224.0/assert/assert_throws.ts";
import { getIndentLevel } from "../src/frame.ts";

Deno.test("getIndentLevel - root is zero", () => {
    const line = "- Root Frame" as Line;
    const result = getIndentLevel(line);
    assertEquals(result, 0);
});

Deno.test("getIndentLevel - two is 1", () => {
    const line = "  - Item 1" as Line;
    const result = getIndentLevel(line);
    assertEquals(result, 1);
});

Deno.test("getIndentLevel - four is 2", () => {
    const line = "    - Item 1" as Line;
    const result = getIndentLevel(line);
    assertEquals(result, 2);
});

Deno.test("getIndentLevel - Odd numbers throw", () => {
    const line = "   - Item 1" as Line;
    assertThrows(() => getIndentLevel(line));
});
