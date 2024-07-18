import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { instantiateNewListIfNeeded } from "../src/frame.ts";

Deno.test("instantiateNewListIfNeeded - empty list", () => {
    const lines: string[] = [];
    const result = instantiateNewListIfNeeded(lines);
    assertEquals(result, ["- Root Frame @"]);
});

Deno.test("instantiateNewListIfNeeded - list with only whitespace", () => {
    const lines = ["  ", "\t"];
    const result = instantiateNewListIfNeeded(lines);
    assertEquals(result, ["- Root Frame @"]);
});

Deno.test("instantiateNewListIfNeeded - non-empty list", () => {
    const lines = [
        "- Root Frame @",
        "  - Item 1",
        "    - Item 1.1",
    ];
    const result = instantiateNewListIfNeeded(lines);
    assertEquals(result, [
        "- Root Frame @",
        "  - Item 1",
        "    - Item 1.1",
    ]);
});

Deno.test("instantiateNewListIfNeeded - list with items", () => {
    const lines = [
        "- Root Frame",
        "  - Item 1",
        "    - Item 1.1",
    ];
    const result = instantiateNewListIfNeeded(lines);
    assertEquals(result, [
        "- Root Frame",
        "  - Item 1",
        "    - Item 1.1",
    ]);
});
