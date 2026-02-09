import { describe, expect, it } from "vitest";
import {
  mergeItemsForAddPreview,
  parseNarrowQuery,
} from "./listFocusNarrowQuery";

describe("parseNarrowQuery", () => {
  it("returns empty array for empty or whitespace", () => {
    expect(parseNarrowQuery("")).toEqual([]);
    expect(parseNarrowQuery("   ")).toEqual([]);
  });

  it("parses single item", () => {
    expect(parseNarrowQuery("A")).toEqual([
      { display: "A", key: "new-0" },
    ]);
  });

  it("parses siblings with comma", () => {
    expect(parseNarrowQuery("A, B")).toEqual([
      { display: "A", key: "new-0" },
      { display: "B", key: "new-1" },
    ]);
  });

  it("parses nested with slash", () => {
    expect(parseNarrowQuery("A / B")).toEqual([
      { display: "A", key: "new-0" },
      { display: "  B", key: "new-1" },
    ]);
  });

  it("parses siblings and nested (slash/comma grammar)", () => {
    expect(parseNarrowQuery("A, B / C")).toEqual([
      { display: "A", key: "new-0" },
      { display: "B", key: "new-1" },
      { display: "  C", key: "new-2" },
    ]);
  });
});

describe("mergeItemsForAddPreview", () => {
  it("returns current items when new branch is empty", () => {
    const current = [
      { display: "Root", key: "0" },
      { display: "  Current @", key: "1" },
    ];
    expect(mergeItemsForAddPreview(current, "1", [])).toEqual(current);
  });

  it("inserts new branch after current with correct indent", () => {
    const current = [
      { display: "Root", key: "0" },
      { display: "  Current @", key: "1" },
    ];
    const newBranch = [
      { display: "A", key: "new-0" },
      { display: "  B", key: "new-1" },
    ];
    const merged = mergeItemsForAddPreview(current, "1", newBranch);
    expect(merged).toHaveLength(4);
    expect(merged[0]).toEqual({ display: "Root", key: "0" });
    expect(merged[1]).toEqual({ display: "  Current @", key: "1" });
    expect(merged[2].display).toBe("    A");
    expect(merged[2].key).toBe("new-0");
    expect(merged[3].display).toBe("      B");
    expect(merged[3].key).toBe("new-1");
  });
});
