/**
 * Tests for pathSimilarity and filenameSimilarity (path similarity helpers).
 */
import { describe, expect, it } from "vitest";
import { pathSimilarity, filenameSimilarity } from "./nowSimilarity";

describe("pathSimilarity", () => {
  it("returns number of leading path segments that match", () => {
    expect(pathSimilarity("/a/b/c", "/a/b/c")).toBe(3);
    expect(pathSimilarity("/a/b/c", "/a/b/d")).toBe(2);
    expect(pathSimilarity("/a/b/c", "/x/y/z")).toBe(0);
    expect(pathSimilarity("/", "/a")).toBe(0);
  });
});

describe("filenameSimilarity", () => {
  it("returns 1 for identical strings", () => {
    expect(filenameSimilarity("notes.md", "notes.md")).toBe(1);
  });
  it("returns 0 when one is empty", () => {
    expect(filenameSimilarity("", "a")).toBe(0);
    expect(filenameSimilarity("a", "")).toBe(0);
  });
  it("returns value in 0-1 for similar filenames", () => {
    const s = filenameSimilarity("notes.md", "notes-draft.md");
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(1);
  });
});
