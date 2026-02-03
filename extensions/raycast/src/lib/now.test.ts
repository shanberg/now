/**
 * Tests for getDocPathForCurrentDocument, pathSimilarity, and filenameSimilarity.
 */
import { describe, expect, it } from "vitest";
import {
  getDocPathForCurrentDocument,
  pathSimilarity,
  filenameSimilarity,
  resolveNowFilePath,
} from "./now";

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

describe("getDocPathForCurrentDocument", () => {
  const home = process.env.HOME ?? "/tmp";
  const nowPath = `${home}/.now/notes.now.md`;

  it("returns null for empty documentPath", () => {
    expect(getDocPathForCurrentDocument('{"": "x"}', "")).toBeNull();
    expect(getDocPathForCurrentDocument('{"/a": "x"}', "   ")).toBeNull();
  });

  it("returns null for empty or invalid JSON", () => {
    expect(getDocPathForCurrentDocument("", "/a/notes.md")).toBeNull();
    expect(getDocPathForCurrentDocument("{}", "/a/notes.md")).toBeNull();
    expect(getDocPathForCurrentDocument("invalid", "/a/notes.md")).toBeNull();
  });

  it("exact match: stored path === current path returns that now file", () => {
    const docPath = "/Users/me/proj/notes.md";
    const json = JSON.stringify({ [docPath]: nowPath });
    expect(getDocPathForCurrentDocument(json, docPath)).toBe(
      resolveNowFilePath(nowPath),
    );
  });

  it("exact match with normalization: resolve equality (trailing slash)", () => {
    const docPath = "/Users/me/proj/notes.md";
    const json = JSON.stringify({ [docPath]: nowPath });
    expect(getDocPathForCurrentDocument(json, "/Users/me/proj/notes.md/")).toBe(
      resolveNowFilePath(nowPath),
    );
  });

  it("exact match with normalization: stored key has ./", () => {
    const storedKey = "/Users/me/proj/./notes.md";
    const json = JSON.stringify({ [storedKey]: nowPath });
    expect(getDocPathForCurrentDocument(json, "/Users/me/proj/notes.md")).toBe(
      resolveNowFilePath(nowPath),
    );
  });

  it("same filename, path changed: returns entry with closest path", () => {
    const storedPath = "/Users/me/proj/notes.md";
    const currentPath = "/Users/me/proj/other/notes.md";
    const json = JSON.stringify({ [storedPath]: nowPath });
    expect(getDocPathForCurrentDocument(json, currentPath)).toBe(
      resolveNowFilePath(nowPath),
    );
  });

  it("same path (dirname), filename changed: returns entry with closest filename", () => {
    const storedPath = "/Users/me/proj/notes.md";
    const currentPath = "/Users/me/proj/notes-draft.md";
    const json = JSON.stringify({ [storedPath]: nowPath });
    expect(getDocPathForCurrentDocument(json, currentPath)).toBe(
      resolveNowFilePath(nowPath),
    );
  });

  it("same path with stored key containing ./: normalizes and matches by path", () => {
    const storedPath = "/Users/me/proj/./notes.md";
    const currentPath = "/Users/me/proj/notes-draft.md";
    const json = JSON.stringify({ [storedPath]: nowPath });
    expect(getDocPathForCurrentDocument(json, currentPath)).toBe(
      resolveNowFilePath(nowPath),
    );
  });

  it("no same-filename and no same-path candidates returns null", () => {
    const json = JSON.stringify({ "/a/b/other.md": nowPath });
    expect(getDocPathForCurrentDocument(json, "/x/y/notes.md")).toBeNull();
  });

  it("tiebreaker: multiple same-filename with equal path similarity picks lexicographically smallest stored key", () => {
    const pathA = "/a/b/c/notes.md";
    const pathB = "/a/b/d/notes.md";
    const nowA = `${home}/.now/a.now.md`;
    const nowB = `${home}/.now/b.now.md`;
    const json = JSON.stringify({ [pathA]: nowA, [pathB]: nowB });
    const currentPath = "/x/y/z/notes.md";
    const result = getDocPathForCurrentDocument(json, currentPath);
    expect(result).toBe(resolveNowFilePath(nowA));
  });

  it("degenerate path: root or empty basename skips by-filename/by-path", () => {
    const json = JSON.stringify({ "/some/doc.md": nowPath });
    expect(getDocPathForCurrentDocument(json, "/")).toBeNull();
  });
});
