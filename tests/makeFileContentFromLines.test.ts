// @deno-types="../types.d.ts"
import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { makeFileContentFromLines } from "../src/frame.ts";

Deno.test("makeFileContentFromLines - Empty Array", () => {
    const lines = [] as Line[]
    const result = makeFileContentFromLines(lines);
    assertEquals(result, "");
});

Deno.test("makeFileContentFromLines - Single Line", () => {
    const lines = ["- Item 1"] as Line[]
    const result = makeFileContentFromLines(lines);
    assertEquals(result, "- Item 1");
});

Deno.test("makeFileContentFromLines - Multiple Lines", () => {
    const lines = ["- Item 1", "  - Item 1.1", "  - Item 1.2", "- Item 2"] as Line[]
    const result = makeFileContentFromLines(lines);
    assertEquals(result, "- Item 1\n  - Item 1.1\n  - Item 1.2\n- Item 2");
});

Deno.test("makeFileContentFromLines - Lines with Leading and Trailing Whitespace", () => {
    const lines = ["  - Item 1  ", "  - Item 2  "] as Line[]
    const result = makeFileContentFromLines(lines);
    assertEquals(result, "  - Item 1  \n  - Item 2  ");
});

Deno.test("makeFileContentFromLines - Lines with Empty Strings", () => {
    const lines = ["- Item 1", "", "- Item 2"] as Line[]
    const result = makeFileContentFromLines(lines);
    assertEquals(result, "- Item 1\n\n- Item 2");
});