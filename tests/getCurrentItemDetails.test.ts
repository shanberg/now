// @deno-types="../types.d.ts"
import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { assertThrows } from "https://deno.land/std@0.224.0/assert/assert_throws.ts";
import { getCurrentItemDetails } from "../src/frame.ts";

Deno.test("getCurrentItemDetails - returns details for root item", () => {
    const lines = [
        "- Root Frame @",
        "  - Item 1",
        "    - Item 1.1",
        "      - Item 1.1.1",
        "        - Item 1.1.1.1",
    ] as Line[];
    const expectedDetails = { currentItem: "Root Frame", breadcrumbs: [] };

    const result = getCurrentItemDetails(lines);
    assertEquals(result, expectedDetails);
});

Deno.test("getCurrentItemDetails - returns details for first level item", () => {
    const lines = [
        "- Root Frame",
        "  - Item 1 @",
        "    - Item 1.1",
        "      - Item 1.1.1",
        "        - Item 1.1.1.1",
    ] as Line[];
    const expectedDetails = {
        currentItem: "Item 1",
        breadcrumbs: ["Root Frame"],
    };

    const result = getCurrentItemDetails(lines);
    assertEquals(result, expectedDetails);
});

Deno.test("getCurrentItemDetails - returns details for second level item", () => {
    const lines = [
        "- Root Frame",
        "  - Item 1",
        "    - Item 1.1 @",
        "      - Item 1.1.1",
        "        - Item 1.1.1.1",
    ] as Line[];
    const expectedDetails = {
        currentItem: "Item 1.1",
        breadcrumbs: ["Root Frame", "Item 1"],
    };

    const result = getCurrentItemDetails(lines);
    assertEquals(result, expectedDetails);
});

Deno.test("getCurrentItemDetails - returns details for third level item", () => {
    const lines = [
        "- Root Frame",
        "  - Item 1",
        "    - Item 1.1",
        "      - Item 1.1.1 @",
        "        - Item 1.1.1.1",
    ] as Line[];
    const expectedDetails = {
        currentItem: "Item 1.1.1",
        breadcrumbs: ["Root Frame", "Item 1", "Item 1.1"],
    };

    const result = getCurrentItemDetails(lines);
    assertEquals(result, expectedDetails);
});

Deno.test("getCurrentItemDetails - returns details for fourth level item", () => {
    const lines = [
        "- Root Frame",
        "  - Item 1",
        "    - Item 1.1",
        "      - Item 1.1.1",
        "        - Item 1.1.1.1 @",
    ] as Line[];
    const expectedDetails = {
        currentItem: "Item 1.1.1.1",
        breadcrumbs: ["Root Frame", "Item 1", "Item 1.1", "Item 1.1.1"],
    };

    const result = getCurrentItemDetails(lines);
    assertEquals(result, expectedDetails);
});

Deno.test("getCurrentItemDetails - throws error if no current item found", () => {
    const lines = [
        "- Root Frame",
        "  - Item 1",
        "    - Item 1.1",
        "      - Item 1.1.1",
        "        - Item 1.1.1.1",
    ] as Line[];

    assertThrows(
        () => {
            getCurrentItemDetails(lines);
        },
        Error,
        "No current item found.",
    );
});

Deno.test("getCurrentItemDetails - returns details for second branch first level item", () => {
    const lines = [
        "- Root Frame",
        "  - Item 1",
        "    - Item 1.1",
        "  - Item 2 @",
        "    - Item 2.1",
    ] as Line[];
    const expectedDetails = {
        currentItem: "Item 2",
        breadcrumbs: ["Root Frame"],
    };

    const result = getCurrentItemDetails(lines);
    assertEquals(result, expectedDetails);
});

Deno.test("getCurrentItemDetails - returns details for second branch second level item", () => {
    const lines = [
        "- Root Frame",
        "  - Item 1",
        "    - Item 1.1",
        "  - Item 2",
        "    - Item 2.1 @",
    ] as Line[];
    const expectedDetails = {
        currentItem: "Item 2.1",
        breadcrumbs: ["Root Frame", "Item 2"],
    };

    const result = getCurrentItemDetails(lines);
    assertEquals(result, expectedDetails);
});

Deno.test("getCurrentItemDetails - returns details for third branch first level item", () => {
    const lines = [
        "- Root Frame",
        "  - Item 1",
        "    - Item 1.1",
        "  - Item 2",
        "    - Item 2.1",
        "  - Item 3 @",
    ] as Line[];
    const expectedDetails = {
        currentItem: "Item 3",
        breadcrumbs: ["Root Frame"],
    };

    const result = getCurrentItemDetails(lines);
    assertEquals(result, expectedDetails);
});

Deno.test("getCurrentItemDetails - returns details for third branch second level item", () => {
    const lines = [
        "- Root Frame",
        "  - Item 1",
        "    - Item 1.1",
        "  - Item 2",
        "    - Item 2.1",
        "  - Item 3",
        "    - Item 3.1 @",
    ] as Line[];
    const expectedDetails = {
        currentItem: "Item 3.1",
        breadcrumbs: ["Root Frame", "Item 3"],
    };

    const result = getCurrentItemDetails(lines);
    assertEquals(result, expectedDetails);
});
