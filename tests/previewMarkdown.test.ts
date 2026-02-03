/**
 * Tests for buildPreviewMarkdown and truncateBreadcrumb from now-format.
 */
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildPreviewMarkdown, truncateBreadcrumb } from "now-format";

const ITEMS = [
  { display: "Root", key: "0" },
  { display: "  Alpha", key: "1" },
  { display: "  Beta @", key: "2" },
  { display: "  Gamma", key: "3" },
];

Deno.test("truncateBreadcrumb - returns text when within limit or maxLength <= 0", () => {
  assertEquals(truncateBreadcrumb("short", 32), "short");
  assertEquals(truncateBreadcrumb("short", 5), "short");
  assertEquals(truncateBreadcrumb("short", 0), "short");
  assertEquals(truncateBreadcrumb("short", -1), "short");
});

Deno.test("truncateBreadcrumb - truncates from center with ellipsis", () => {
  const long = "Accomplish quarterly goals / Learn rust / Take a course";
  assertEquals(truncateBreadcrumb(long, 32).length, 32);
  assertEquals(truncateBreadcrumb(long, 32).includes("…"), true);
  assertEquals(truncateBreadcrumb(long, 10), "Acco…ourse");
});

Deno.test("buildPreviewMarkdown - no selection shows focus marker on current only", () => {
  const md = buildPreviewMarkdown(
    ITEMS,
    "2",
    "Root",
    "Beta",
    null,
    null,
  );
  assertEquals(md.includes("Root"), true);
  assertEquals(md.includes("▶ **Beta**"), true);
  assertEquals(md.includes("▶ Beta"), true);
  assertEquals(md.includes("```"), true);
  assertEquals(md.includes("Alpha"), true);
  assertEquals(md.includes("Gamma"), true);
});

Deno.test("buildPreviewMarkdown - selected item shows ▶ on selected row", () => {
  const md = buildPreviewMarkdown(
    ITEMS,
    "2",
    "Root",
    "Beta",
    "3",
    null,
  );
  assertEquals(md.includes("▶ Gamma"), true);
});

Deno.test("buildPreviewMarkdown - action complete shows ✓ and next focus", () => {
  const md = buildPreviewMarkdown(
    ITEMS,
    "2",
    "Root",
    "Beta",
    null,
    "complete",
  );
  assertEquals(md.includes("✓ "), true);
  assertEquals(md.includes("▶ Alpha"), true);
});

Deno.test("buildPreviewMarkdown - action add shows placeholder after current", () => {
  const md = buildPreviewMarkdown(
    ITEMS,
    "2",
    "Root",
    "Beta",
    null,
    "add",
  );
  assertEquals(md.includes("______"), true);
  assertEquals(md.includes("▶ ______"), true);
});

Deno.test("buildPreviewMarkdown - action later shows placeholder after current", () => {
  const md = buildPreviewMarkdown(
    ITEMS,
    "2",
    "Root",
    "Beta",
    null,
    "later",
  );
  assertEquals(md.includes("______"), true);
});

Deno.test("buildPreviewMarkdown - action wrap shows wrap parent and indented current", () => {
  const md = buildPreviewMarkdown(
    ITEMS,
    "2",
    "Root",
    "Beta",
    null,
    "wrap",
  );
  assertEquals(md.includes("✎ ______"), true);
  assertEquals(md.includes("▶ Beta"), true);
});

Deno.test("buildPreviewMarkdown - action dive-in shows previous focus and new focus on first deepest child", () => {
  const md = buildPreviewMarkdown(
    ITEMS,
    "0",
    "Focusing on",
    "Root",
    null,
    "dive-in",
  );
  assertEquals(md.includes("▷ Root"), true);
  assertEquals(md.includes("▶ Alpha"), true);
  assertEquals(md.includes("▶ **Alpha**"), true);
});

Deno.test("buildPreviewMarkdown - breadcrumbMaxLength center-truncates breadcrumb", () => {
  const longBreadcrumb = "Accomplish quarterly goals / Learn rust / Take a course";
  const md = buildPreviewMarkdown(
    ITEMS,
    "2",
    longBreadcrumb,
    "Beta",
    null,
    null,
    32,
  );
  const firstLine = md.split("\n")[0];
  assertEquals(firstLine.length, 32);
  assertEquals(firstLine.includes("…"), true);
});
