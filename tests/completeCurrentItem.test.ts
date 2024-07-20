// @deno-types="../types.d.ts"
import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { setIndentLevel } from "../src/frame.ts";

Deno.test("setIndentLevel - Basic Indentation", () => {
    const line = "- Item 1" as Line;
    const result = setIndentLevel(line, 2);
    assertEquals(result, "    - Item 1");
});

Deno.test("setIndentLevel - No Indentation", () => {
    const line = "    - Item 2" as Line;
    const result = setIndentLevel(line, 0);
    assertEquals(result, "- Item 2");
});

Deno.test("setIndentLevel - Multiple Indentations", () => {
    const line = "- Item 3" as Line;
    const result1 = setIndentLevel(line, 1);
    assertEquals(result1, "  - Item 3");

    const result2 = setIndentLevel(line, 3);
    assertEquals(result2, "      - Item 3");
});

Deno.test("setIndentLevel - Leading Whitespace", () => {
    const line = "  - Item 4" as Line;
    const result = setIndentLevel(line, 2);
    assertEquals(result, "    - Item 4");
});

Deno.test("setIndentLevel - Empty Line", () => {
    const line = "" as Line;
    const result = setIndentLevel(line, 2);
    assertEquals(result, "    ");
});

Deno.test("setIndentLevel - Negative Indentation Level", () => {
    const line = "- Item 5" as Line;
    const result = setIndentLevel(line, -1);
    assertEquals(result, "- Item 5"); // Assuming negative indentation is treated as 0
});

Deno.test("setIndentLevel - Excessively Large Indentation Level", () => {
    const line = "- Item 6" as Line;
    const result = setIndentLevel(line, 100);
    assertEquals(result, " ".repeat(100 * 2) + "- Item 6"); // Assuming INDENT is 2 spaces
});
