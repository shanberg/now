/**
 * Tests for computePathSwitchContext and pathSwitchContextToDescriptors.
 */
import { describe, expect, it } from "vitest";
import {
  computePathSwitchContext,
  pathSwitchContextSwitchTargetPaths,
  pathSwitchContextToDescriptors,
  type PathSwitchContextInput,
} from "./pathContext";

const defaultPath = "/home/.now/focus.now.md";
const docPath = "/doc/notes.now.md";
const appPath = "/home/.now/term.now.md";

function input(overrides: Partial<PathSwitchContextInput> = {}): PathSwitchContextInput {
  return {
    activePath: defaultPath,
    defaultPath,
    docPathForCurrent: null,
    appPathForCurrent: null,
    currentApp: null,
    currentDocumentPath: null,
    ...overrides,
  };
}

describe("computePathSwitchContext", () => {
  it("no options visible when activePath === defaultPath and no doc/app/create options", () => {
    const ctx = computePathSwitchContext(input());
    expect(ctx.switchToGlobal.visible).toBe(false);
    expect(ctx.switchToDocument.visible).toBe(false);
    expect(ctx.switchToApp.visible).toBe(false);
    expect(ctx.createForDocument.visible).toBe(false);
    expect(ctx.createForApp.visible).toBe(false);
    expect(ctx.contextLabel).toBe("Now");
  });

  it("switch to Global visible when activePath !== defaultPath", () => {
    const ctx = computePathSwitchContext(
      input({ activePath: docPath, docPathForCurrent: docPath }),
    );
    expect(ctx.switchToGlobal.visible).toBe(true);
    if (ctx.switchToGlobal.visible) {
      expect(ctx.switchToGlobal.path).toBe(defaultPath);
    }
    expect(ctx.contextLabel).toBe("Now");
  });

  it("switch to Document visible when docPathForCurrent set and activePath differs", () => {
    const ctx = computePathSwitchContext(
      input({
        activePath: defaultPath,
        docPathForCurrent: docPath,
        currentDocumentPath: "/doc/notes.md",
      }),
    );
    expect(ctx.switchToDocument.visible).toBe(true);
    if (ctx.switchToDocument.visible) {
      expect(ctx.switchToDocument.path).toBe(docPath);
      expect(ctx.switchToDocument.label).toBe("notes.md");
    }
  });

  it("switch to App visible when appPathForCurrent and currentApp set and activePath differs", () => {
    const app = { name: "Terminal", bundleId: "com.apple.Terminal" };
    const ctx = computePathSwitchContext(
      input({
        activePath: defaultPath,
        appPathForCurrent: appPath,
        currentApp: app,
      }),
    );
    expect(ctx.switchToApp.visible).toBe(true);
    if (ctx.switchToApp.visible) {
      expect(ctx.switchToApp.path).toBe(appPath);
      expect(ctx.switchToApp.label).toBe("Terminal");
    }
  });

  it("create for Document visible when currentDocumentPath set and no docPathForCurrent", () => {
    const currentDoc = "/Users/me/proj/notes.md";
    const ctx = computePathSwitchContext(
      input({
        currentDocumentPath: currentDoc,
        docPathForCurrent: null,
      }),
    );
    expect(ctx.createForDocument.visible).toBe(true);
    if (ctx.createForDocument.visible) {
      expect(ctx.createForDocument.displayName).toBe("notes.md");
      expect(ctx.createForDocument.suggestedPath).toContain("notes.now.md");
    }
  });

  it("create for App visible when currentApp set and no appPathForCurrent", () => {
    const app = { name: "Terminal" };
    const ctx = computePathSwitchContext(
      input({ currentApp: app, appPathForCurrent: null }),
    );
    expect(ctx.createForApp.visible).toBe(true);
    if (ctx.createForApp.visible) {
      expect(ctx.createForApp.displayName).toBe("Terminal");
      expect(ctx.createForApp.suggestedPath).toContain("Terminal.now.md");
    }
  });

  it("contextLabel is Now when activePath is defaultPath", () => {
    expect(computePathSwitchContext(input()).contextLabel).toBe("Now");
  });

  it("contextLabel shows document when activePath === docPathForCurrent", () => {
    const ctx = computePathSwitchContext(
      input({
        activePath: docPath,
        docPathForCurrent: docPath,
        currentDocumentPath: "/doc/notes.md",
      }),
    );
    expect(ctx.contextLabel).toBe("Now: notes.md");
  });

  it("contextLabel shows app when activePath === appPathForCurrent", () => {
    const app = { name: "Terminal" };
    const ctx = computePathSwitchContext(
      input({
        activePath: appPath,
        appPathForCurrent: appPath,
        currentApp: app,
      }),
    );
    expect(ctx.contextLabel).toBe("Now: Terminal");
  });

  it("activePath null treats as not equal to defaultPath so switchToGlobal can be visible", () => {
    const ctx = computePathSwitchContext(input({ activePath: null }));
    expect(ctx.switchToGlobal.visible).toBe(false);
    expect(ctx.contextLabel).toBe("Now");
  });
});

describe("pathSwitchContextToDescriptors", () => {
  it("returns empty array when no actions visible", () => {
    const ctx = computePathSwitchContext(input());
    expect(pathSwitchContextToDescriptors(ctx)).toEqual([]);
  });

  it("returns descriptors in order: create doc, create app, switch global, switch document, switch app", () => {
    const app = { name: "Terminal", bundleId: "com.apple.Terminal" };
    const ctx = computePathSwitchContext(
      input({
        activePath: "/other.now.md",
        docPathForCurrent: docPath,
        appPathForCurrent: appPath,
        currentApp: app,
        currentDocumentPath: "/doc/notes.md",
      }),
    );
    const descriptors = pathSwitchContextToDescriptors(ctx);
    const ids = descriptors.map((d) => d.id);
    expect(ids).toEqual([
      "switch-global",
      "switch-document",
      "switch-app",
    ]);
  });

  it("includes create descriptors when visible", () => {
    const ctx = computePathSwitchContext(
      input({
        currentDocumentPath: "/a/notes.md",
        currentApp: { name: "Xcode" },
      }),
    );
    const descriptors = pathSwitchContextToDescriptors(ctx);
    expect(descriptors).toHaveLength(2);
    expect(descriptors[0].id).toBe("create-document");
    expect((descriptors[0] as { title: string }).title).toContain("notes.md");
    expect(descriptors[1].id).toBe("create-app");
    expect((descriptors[1] as { title: string }).title).toContain("Xcode");
  });
});

describe("pathSwitchContextSwitchTargetPaths", () => {
  it("returns empty when no switch actions visible", () => {
    const ctx = computePathSwitchContext(input());
    expect(pathSwitchContextSwitchTargetPaths(ctx)).toEqual([]);
  });

  it("returns defaultPath when switch to Global visible", () => {
    const ctx = computePathSwitchContext(
      input({ activePath: docPath, docPathForCurrent: docPath }),
    );
    expect(pathSwitchContextSwitchTargetPaths(ctx)).toContain(defaultPath);
  });

  it("returns doc and app paths when those switches visible", () => {
    const app = { name: "Terminal" };
    const ctx = computePathSwitchContext(
      input({
        activePath: defaultPath,
        docPathForCurrent: docPath,
        appPathForCurrent: appPath,
        currentApp: app,
        currentDocumentPath: "/doc/notes.md",
      }),
    );
    const paths = pathSwitchContextSwitchTargetPaths(ctx);
    expect(paths).toContain(docPath);
    expect(paths).toContain(appPath);
  });
});
