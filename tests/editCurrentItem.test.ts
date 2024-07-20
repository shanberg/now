// @deno-types="../types.d.ts"
import {
    assertEquals,
} from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import {
    assertThrows,
} from "https://deno.land/std@0.224.0/assert/assert_throws.ts";
import { editCurrentItem } from "../src/frame.ts";

Deno.test("editCurrentItem - edits the current item correctly", () => {
    const lines = [
        "- Root Frame",
        "  - Item 1",
        "    - Item 1.1 @",
        "    - Item 1.2",
        "  - Item 2",
        "    - Item 2.1",
        "    - Item 2.2",
    ] as Line[];
    const newText = "Edited Item 1.1";
    const expectedLines = [
        "- Root Frame",
        "  - Item 1",
        "    - Edited Item 1.1 @",
        "    - Item 1.2",
        "  - Item 2",
        "    - Item 2.1",
        "    - Item 2.2",
    ] as Line[];

    const result = editCurrentItem(lines, newText);
    assertEquals(result, expectedLines);
});

Deno.test("editCurrentItem - throws error when no current item is found", () => {
    const lines = [
        "- Root Frame",
        "  - Item 1",
        "    - Item 1.1",
        "    - Item 1.2",
        "  - Item 2",
        "    - Item 2.1",
        "    - Item 2.2",
    ] as Line[];
    const newText = "Edited Item 1.1";

    assertThrows(
        () => {
            editCurrentItem(lines, newText);
        },
        Error,
        "No current item found.",
    );
});

Deno.test("editCurrentItem - maintains indentation", () => {
    const lines = [
        "- Root Frame",
        "  - Item 1",
        "    - Item 1.1",
        "    - Item 1.2",
        "  - Item 2",
        "    - Item 2.1 @",
        "    - Item 2.2",
    ] as Line[];
    const newText = "Edited Item 2.1";
    const expectedLines = [
        "- Root Frame",
        "  - Item 1",
        "    - Item 1.1",
        "    - Item 1.2",
        "  - Item 2",
        "    - Edited Item 2.1 @",
        "    - Item 2.2",
    ] as Line[];

    const result = editCurrentItem(lines, newText);
    assertEquals(result, expectedLines);
});

Deno.test("editCurrentItem - handles empty lines array", () => {
    const lines = [] as Line[];
    const newText = "Edited Item";

    assertThrows(
        () => {
            editCurrentItem(lines, newText);
        },
        Error,
        "No current item found.",
    );
});
