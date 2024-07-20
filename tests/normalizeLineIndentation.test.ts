// @deno-types="../types.d.ts"
import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { normalizeLineIndentation } from "../src/frame.ts";

Deno.test("normalizeLineIndentation - root", () => {
    const line = "- Item 1" as Line;
    const result = normalizeLineIndentation(line);
    assertEquals(result, "- Item 1");
});

Deno.test("normalizeLineIndentation - 1 to 2", () => {
    const line = " - Item 1" as Line;
    const result = normalizeLineIndentation(line);
    assertEquals(result, "  - Item 1");
});

Deno.test("normalizeLineIndentation - 2 to 2", () => {
    const line = "  - Item 1" as Line;
    const result = normalizeLineIndentation(line);
    assertEquals(result, "  - Item 1");
});

Deno.test("normalizeLineIndentation - 3 to 4", () => {
    const line = "   - Item 1" as Line;
    const result = normalizeLineIndentation(line);
    assertEquals(result, "    - Item 1");
});
