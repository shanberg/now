// @deno-types="../types.d.ts"
import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { correctIndentation } from "../src/frame.ts";

Deno.test("correctIndentation - Correct Indentation", () => {
    const lines: Line[] = [
        "- Root Frame",
        "  - Item 1",
        "    - Item 1.1",
        "    - Item 1.2",
        "  - Item 2",
        "    - Item 2.1",
        "    - Item 2.2",
    ] as Line[];
    const result = correctIndentation(lines);
    assertEquals(result, lines); // Should remain unchanged
});

Deno.test("correctIndentation - Irregular Indentation", () => {
    const lines: Line[] = [
        "- Root Frame",
        " - Item 1", // 1 space
        "  - Item 2", // 2 spaces
        "", // empty
        "  - Item 3", // 4 spaces
        "          - Item 3.1", // 10 spaces
        "  - Item 4", // 2 spaces
    ] as Line[];
    const expected: Line[] = [
        "- Root Frame",
        "  - Item 1", // Corrected to 2 spaces
        "  - Item 2", // Corrected to 2 spaces
        "",
        "  - Item 3", // corrected to 2 spaces
        "    - Item 3.1", // Corrected to 4 spaces
        "  - Item 4", // Remains unchanged
    ] as Line[];
    const result = correctIndentation(lines);
    assertEquals(result, expected);
});

Deno.test("correctIndentation - Empty Lines", () => {
    const lines: Line[] = [
        "- Root Frame",
        "",
        "  - Item 1",
        "",
        "  - Item 2",
    ] as Line[];
    const result = correctIndentation(lines);
    assertEquals(result, lines); // Should remain unchanged
});

Deno.test("correctIndentation - Single Line", () => {
    const lines: Line[] = ["  - Item 1"] as Line[];
    const result = correctIndentation(lines);
    assertEquals(result, ["  - Item 1"]);
});

Deno.test("correctIndentation - No Indentation", () => {
    const lines: Line[] = ["- Item 1", "- Item 2"] as Line[];
    const result = correctIndentation(lines);
    assertEquals(result, lines); // Should remain unchanged
});

Deno.test("correctIndentation - Root always zero", () => {
    const lines = [
        "    - Root Frame",
        "    - Item 1",
        "    - Item 2",
        "    - Item 3",
        "    - Item 4",
    ] as Line[];
    const result = correctIndentation(lines);
    assertEquals(result, [
        "- Root Frame",
        "  - Item 1",
        "  - Item 2",
        "  - Item 3",
        "  - Item 4",
    ]);
});
