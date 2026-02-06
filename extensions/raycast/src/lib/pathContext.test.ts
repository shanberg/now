/**
 * Tests for computePathSwitchContext and pathSwitchContextToDescriptors.
 */
import { describe, expect, it } from "vitest";
import {
  computePathSwitchContext,
  pathSwitchContextSwitchTargetPaths,
  pathSwitchContextToDescriptors,
  type PathSwitchContext,
  type PathSwitchContextInput,
} from "./pathContext";

const defaultPath = "/home/.now/focus.now.md";
const otherPath = "/home/.now/other.now.md";
const appPath = "/home/.now/term.now.md";

function input(
  overrides: Partial<PathSwitchContextInput> = {},
): PathSwitchContextInput {
  return {
    activePath: defaultPath,
    defaultPath,
    appPathForCurrent: null,
    currentApp: null,
    ...overrides,
  };
}

function expectAllHidden(ctx: PathSwitchContext): void {
  expect(ctx.switchToGlobal.visible).toBe(false);
  expect(ctx.switchToApp.visible).toBe(false);
  expect(ctx.createForApp.visible).toBe(false);
}

function expectSwitchToGlobalVisible(
  ctx: PathSwitchContext,
  expectedPath: string,
): void {
  expect(ctx.switchToGlobal.visible).toBe(true);
  if (ctx.switchToGlobal.visible)
    expect(ctx.switchToGlobal.path).toBe(expectedPath);
}

function expectSwitchToAppVisible(
  ctx: PathSwitchContext,
  expectedPath: string,
  expectedLabel: string,
): void {
  expect(ctx.switchToApp.visible).toBe(true);
  if (ctx.switchToApp.visible) {
    expect(ctx.switchToApp.path).toBe(expectedPath);
    expect(ctx.switchToApp.label).toBe(expectedLabel);
  }
}

function expectCreateForAppVisible(
  ctx: PathSwitchContext,
  displayName: string,
  suggestedPathContains: string,
): void {
  expect(ctx.createForApp.visible).toBe(true);
  if (ctx.createForApp.visible) {
    expect(ctx.createForApp.displayName).toBe(displayName);
    expect(ctx.createForApp.suggestedPath).toContain(suggestedPathContains);
  }
}

function visibilitySpec() {
  it("no options visible when activePath === defaultPath and no app/create options", () => {
    const ctx = computePathSwitchContext(input());
    expectAllHidden(ctx);
    expect(ctx.contextLabel).toBe("Now");
  });

  it("switch to Global visible when activePath !== defaultPath", () => {
    const ctx = computePathSwitchContext(input({ activePath: otherPath }));
    expectSwitchToGlobalVisible(ctx, defaultPath);
    expect(ctx.contextLabel).toBe("Now");
  });

  it("switch to App visible when appPathForCurrent and currentApp set and activePath differs", () => {
    const ctx = computePathSwitchContext(
      input({
        activePath: defaultPath,
        appPathForCurrent: appPath,
        currentApp: { name: "Terminal", bundleId: "com.apple.Terminal" },
      }),
    );
    expectSwitchToAppVisible(ctx, appPath, "Terminal");
  });

  it("create for App visible when currentApp set and no appPathForCurrent", () => {
    const ctx = computePathSwitchContext(
      input({ currentApp: { name: "Terminal" }, appPathForCurrent: null }),
    );
    expectCreateForAppVisible(ctx, "Terminal", "Terminal.now.md");
  });

  it("activePath null treats as not equal to defaultPath so switchToGlobal can be visible", () => {
    const ctx = computePathSwitchContext(input({ activePath: null }));
    expect(ctx.switchToGlobal.visible).toBe(false);
    expect(ctx.contextLabel).toBe("Now");
  });
}

function contextLabelSpec() {
  it("is Now when activePath is defaultPath", () => {
    expect(computePathSwitchContext(input()).contextLabel).toBe("Now");
  });

  it("shows app when activePath === appPathForCurrent", () => {
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
}

function computePathSwitchContextSpec() {
  describe("visibility", visibilitySpec);
  describe("contextLabel", contextLabelSpec);
}

describe("computePathSwitchContext", computePathSwitchContextSpec);

function pathSwitchContextToDescriptorsSpec() {
  it("returns empty array when no actions visible", () => {
    const ctx = computePathSwitchContext(input());
    expect(pathSwitchContextToDescriptors(ctx)).toEqual([]);
  });

  it("returns descriptors in order: create app, switch global, switch app", () => {
    const app = { name: "Terminal", bundleId: "com.apple.Terminal" };
    const ctx = computePathSwitchContext(
      input({
        activePath: otherPath,
        appPathForCurrent: appPath,
        currentApp: app,
      }),
    );
    const descriptors = pathSwitchContextToDescriptors(ctx);
    const ids = descriptors.map((d) => d.id);
    expect(ids).toEqual(["switch-global", "switch-app"]);
  });

  it("includes create-app descriptor when visible", () => {
    const ctx = computePathSwitchContext(
      input({
        currentApp: { name: "Xcode" },
        appPathForCurrent: null,
      }),
    );
    const descriptors = pathSwitchContextToDescriptors(ctx);
    expect(descriptors).toHaveLength(1);
    expect(descriptors[0].id).toBe("create-app");
    expect((descriptors[0] as { title: string }).title).toContain("Xcode");
  });
}

describe("pathSwitchContextToDescriptors", pathSwitchContextToDescriptorsSpec);

function pathSwitchContextSwitchTargetPathsSpec() {
  it("returns empty when no switch actions visible", () => {
    const ctx = computePathSwitchContext(input());
    expect(pathSwitchContextSwitchTargetPaths(ctx)).toEqual([]);
  });

  it("returns defaultPath when switch to Global visible", () => {
    const ctx = computePathSwitchContext(input({ activePath: otherPath }));
    expect(pathSwitchContextSwitchTargetPaths(ctx)).toContain(defaultPath);
  });

  it("returns defaultPath and app path when both switches visible", () => {
    const app = { name: "Terminal" };
    const ctx = computePathSwitchContext(
      input({
        activePath: otherPath,
        appPathForCurrent: appPath,
        currentApp: app,
      }),
    );
    const paths = pathSwitchContextSwitchTargetPaths(ctx);
    expect(paths).toContain(defaultPath);
    expect(paths).toContain(appPath);
  });
}

describe(
  "pathSwitchContextSwitchTargetPaths",
  pathSwitchContextSwitchTargetPathsSpec,
);
