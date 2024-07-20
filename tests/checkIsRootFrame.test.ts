// @deno-types="../types.d.ts"
import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { checkIsRootFrame } from "../src/frame.ts";

Deno.test("checkIsRootFrame - single root frame", () => {
    const line = "- Root Frame" as Line;
    const result = checkIsRootFrame(line);
    assertEquals(result, true);
});

Deno.test("checkIsRootFrame - not root frame", () => {
    const line = "- Item 1" as Line;
    const result = checkIsRootFrame(line);
    assertEquals(result, false);
});

Deno.test("checkIsRootFrame - with odd indentation", () => {
    let line = " - Root Frame" as Line;
    let result = checkIsRootFrame(line);
    assertEquals(result, true);
    line = "  - Root Frame" as Line;
    result = checkIsRootFrame(line);
    assertEquals(result, true);
    line = "   - Root Frame" as Line;
    result = checkIsRootFrame(line);
    assertEquals(result, true);
    line = "    - Root Frame" as Line;
    result = checkIsRootFrame(line);
    assertEquals(result, true);
});
