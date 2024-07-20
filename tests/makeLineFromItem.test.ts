// @deno-types="../types.d.ts"
import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { assertThrows } from "https://deno.land/std@0.224.0/assert/assert_throws.ts";
import { makeLineFromItem } from "../src/frame.ts";

Deno.test("makeLineFromItem - root level", () => {
    const item = "Item 1" as Item;
    const result = makeLineFromItem(item, 0);
    assertEquals(result, "- Item 1");
});

Deno.test("makeLineFromItem - first level", () => {
    const item = "Item 1" as Item;
    const result = makeLineFromItem(item, 1);
    assertEquals(result, "  - Item 1");
});

Deno.test("makeLineFromItem - Basic Item", () => {
    const item = "Item 1" as Item;
    const result = makeLineFromItem(item, 2);
    assertEquals(result, "    - Item 1");
});

Deno.test("makeLineFromItem - Item with Leading and Trailing Whitespace", () => {
    const item = "  Item 2  " as Item;
    const result = makeLineFromItem(item, 1);
    assertEquals(result, "  - Item 2");
});

Deno.test("makeLineFromItem - Empty Item", () => {
    const item = "" as Item;
    const result = makeLineFromItem(item, 3);
    assertEquals(result, "      - ");
});

Deno.test("makeLineFromItem - Null Item", () => {
    assertThrows(() => {
        makeLineFromItem(null as unknown as Item, 1);
    }, Error, "Item must be a string");
});

Deno.test("makeLineFromItem - Undefined Item", () => {
    assertThrows(() => {
        makeLineFromItem(undefined as unknown as Item, 1);
    }, Error, "Item must be a string");
});

Deno.test("makeLineFromItem - Negative Indent Level", () => {
    const item = "Item 3" as Item;
    assertThrows(() => {
        makeLineFromItem(item, -1);
    }, Error, "Indent level must be a non-negative number");
});

Deno.test("makeLineFromItem - Non-numeric Indent Level", () => {
    const item = "Item 4" as Item;
    assertThrows(() => {
        makeLineFromItem(item, "two" as unknown as number);
    }, Error, "Indent level must be a non-negative number");
});

Deno.test("makeLineFromItem - Zero Indent Level", () => {
    const item = "Item 5" as Item;
    const result = makeLineFromItem(item, 0);
    assertEquals(result, "- Item 5");
});

Deno.test("makeLineFromItem - Large Indent Level", () => {
    const item = "Item 6" as Item;
    const result = makeLineFromItem(item, 100);
    assertEquals(result, " ".repeat(100 * 2) + "- Item 6");
});