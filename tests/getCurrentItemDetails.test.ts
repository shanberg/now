import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { getCurrentItemDetails } from "../src/frame.ts";

Deno.test("getCurrentItemDetails - returns details of the current item", () => {
    const lines = [
        "- Root Frame @",
        "  - Item 1",
        "    - Item 1.1",
        "    - Item 1.2",
        "  - Item 2",
        "    - Item 2.1",
        "    - Item 2.2",
    ];
    const expectedDetails = "\x1b[1m\x1b[32mFocus: Root Frame\x1b[0m";

    const result = getCurrentItemDetails(lines);
    assertEquals(result, expectedDetails);
});

Deno.test("getCurrentItemDetails - returns details with breadcrumb trail", () => {
    const lines = [
        "- Root Frame",
        "  - Item 1",
        "    - Item 1.1 @",
        "    - Item 1.2",
        "  - Item 2",
        "    - Item 2.1",
        "    - Item 2.2",
    ];
    const expectedDetails =
        "\x1b[2m\x1b[32mItem 1 / \x1b[0m\n\x1b[1m\x1b[32mFocus: Item 1.1\x1b[0m";

    const result = getCurrentItemDetails(lines);
    assertEquals(result, expectedDetails);
});

Deno.test("getCurrentItemDetails - returns 'No current item found.' if no current item", () => {
    const lines = [
        "- Root Frame",
        "  - Item 1",
        "    - Item 1.1",
        "    - Item 1.2",
        "  - Item 2",
        "    - Item 2.1",
        "    - Item 2.2",
    ];
    const expectedDetails = "No current item found.";

    const result = getCurrentItemDetails(lines);
    assertEquals(result, expectedDetails);
});

Deno.test("getCurrentItemDetails - returns details for root item", () => {
    const lines = [
        "- Root Frame @",
        "  - Item 1",
        "    - Item 1.1",
        "      - Item 1.1.1",
        "        - Item 1.1.1.1",
    ];
    const expectedDetails = "\x1b[1m\x1b[32mFocus: Root Frame\x1b[0m";

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
    ];
    const expectedDetails = "\x1b[0m\n\x1b[1m\x1b[32mFocus: Item 1\x1b[0m";

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
    ];
    const expectedDetails =
        "\x1b[2m\x1b[32mItem 1 / \x1b[0m\n\x1b[1m\x1b[32mFocus: Item 1.1\x1b[0m";

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
    ];
    const expectedDetails =
        "\x1b[2m\x1b[32mItem 1 / 1 / Item 1.1 / \x1b[0m\n\x1b[1m\x1b[32mFocus: Item 1.1.1\x1b[0m";

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
    ];
    const expectedDetails =
        "\x1b[2m\x1b[32mItem 1 / 2 / Item 1.1 / \x1b[0m\n\x1b[1m\x1b[32mFocus: Item 1.1.1.1\x1b[0m";

    const result = getCurrentItemDetails(lines);
    assertEquals(result, expectedDetails);
});
