import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { completeCurrentItem } from "../src/frame.ts";

Deno.test("completeCurrentItem - complete nested item and move marker to next sibling", () => {
    const lines = [
        "- Root Frame",
        "  - Item 1 @",
        "    - Item 1.1",
        "  - Item 2",
        "    - Item 2.1",
    ];
    const { lines: result, otherBranchesExist } = completeCurrentItem(lines);
    assertEquals(result, [
        "- Root Frame",
        "  - Item 2 @",
        "    - Item 2.1",
    ]);
    assertEquals(otherBranchesExist, true);
});

Deno.test("completeCurrentItem - complete item with multiple branches and update marker", () => {
    const lines = [
        "- Root Frame",
        "  - Item 1",
        "    - Item 1.1 @",
        "  - Item 2",
        "    - Item 2.1",
    ];
    const { lines: result, otherBranchesExist } = completeCurrentItem(lines);
    assertEquals(result, [
        "- Root Frame",
        "  - Item 1 @",
        "  - Item 2",
        "    - Item 2.1",
    ]);
    assertEquals(otherBranchesExist, true);
});

Deno.test("completeCurrentItem - complete root item (should not be allowed)", () => {
    const lines = [
        "- Root Frame @",
        "  - Item 1",
        "    - Item 1.1",
        "  - Item 2",
        "    - Item 2.1",
    ];
    const { lines: result, otherBranchesExist } = completeCurrentItem(lines);
    assertEquals(result, lines); // No change should occur
    assertEquals(otherBranchesExist, true);
});

Deno.test("completeCurrentItem - complete item with no children", () => {
    const lines = [
        "- Root Frame",
        "  - Item 1",
        "    - Item 1.1 @",
        "  - Item 2",
        "    - Item 2.1",
    ];
    const { lines: result, otherBranchesExist } = completeCurrentItem(lines);
    assertEquals(result, [
        "- Root Frame",
        "  - Item 1 @",
        "  - Item 2",
        "    - Item 2.1",
    ]);
    assertEquals(otherBranchesExist, true);
});

Deno.test("completeCurrentItem - complete item and move marker to previous sibling", () => {
    const lines = [
        "- Root Frame",
        "  - Item 1",
        "    - Item 1.1",
        "    - Item 1.2 @",
        "  - Item 2",
        "    - Item 2.1",
    ];
    const { lines: result, otherBranchesExist } = completeCurrentItem(lines);
    assertEquals(result, [
        "- Root Frame",
        "  - Item 1",
        "    - Item 1.1 @",
        "  - Item 2",
        "    - Item 2.1",
    ]);
    assertEquals(otherBranchesExist, true);
});

Deno.test("completeCurrentItem - complete item and move marker to parent", () => {
    const lines = [
        "- Root Frame",
        "  - Item 1 @",
        "    - Item 1.1",
        "      - Item 1.1.1",
        "  - Item 2",
        "    - Item 2.1",
    ];
    const { lines: result, otherBranchesExist } = completeCurrentItem(lines);
    assertEquals(result, [
        "- Root Frame",
        "  - Item 2 @",
        "    - Item 2.1",
    ]);
    assertEquals(otherBranchesExist, true);
});
