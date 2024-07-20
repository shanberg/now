// @deno-types="../types.d.ts"
import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { getItemFromLine } from "../src/frame.ts";
import { assertThrows } from "https://deno.land/std@0.224.0/assert/assert_throws.ts";

Deno.test("getItemFromLine - Basic Item", () => {
    const line = "- Item 1" as Line;
    const result = getItemFromLine(line);
    assertEquals(result, "Item 1");
});

Deno.test("getItemFromLine - Item with Marker", () => {
    const line = "- Item 2 @" as Line;
    const result = getItemFromLine(line);
    assertEquals(result, "Item 2");
});

Deno.test("getItemFromLine - Item with Extra Whitespace", () => {
    const line = "  - Item 3  " as Line;
    const result = getItemFromLine(line);
    assertEquals(result, "Item 3");
});

Deno.test("getItemFromLine - Item with Marker and Extra Whitespace", () => {
    const line = "  - Item 4 @  " as Line;
    const result = getItemFromLine(line);
    assertEquals(result, "Item 4");
});

Deno.test("getItemFromLine - Line without Dash", () => {
    const line = "Item 5" as Line;
    assertThrows(
        () => getItemFromLine(line),
        Error,
        "Line does not start with a dash.");
});

Deno.test("getItemFromLine - Empty Line", () => {
    const line = "-" as Line;
    assertThrows(
        () => getItemFromLine(line),
        Error,
        "Line is empty."
    );
});

Deno.test("getItemFromLine - Line with Only Marker", () => {
    const line = "- @" as Line;
    assertThrows(
        () => getItemFromLine(line),
        Error,
        "Line is empty."
    );
});
