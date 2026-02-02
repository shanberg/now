/**
 * Tests for resolveFocusFilePath and findFocusFileInCwd.
 */
import {
  assert,
  assertRejects,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { resolve } from "std/path/mod.ts";
import {
  findFocusFileInCwd,
  resolveFocusFilePath,
} from "../src/ui/resolveFocus.ts";
import { NOW_FILE_SUFFIX } from "../src/consts.ts";

Deno.test("resolveFocusFilePath - NOW_FILE set returns that path resolved", async () => {
  const tmp = await Deno.makeTempFile({ suffix: ".now.md" });
  const orig = Deno.env.get("NOW_FILE");
  try {
    Deno.env.set("NOW_FILE", tmp);
    const path = await resolveFocusFilePath({ interactive: false });
    assertEquals(path, resolve(Deno.cwd(), tmp));
  } finally {
    if (orig !== undefined) Deno.env.set("NOW_FILE", orig);
    else Deno.env.delete("NOW_FILE");
    await Deno.remove(tmp).catch(() => { });
  }
});

Deno.test(
  "resolveFocusFilePath - unset + file in cwd returns that file resolved",
  { sanitizeOps: false },
  async () => {
    const origCwd = Deno.cwd();
    const tmpDir = await Deno.makeTempDir();
    const fileName = `.test.${NOW_FILE_SUFFIX}`;
    const filePath = resolve(tmpDir, fileName);
    await Deno.writeTextFile(filePath, "- Root @\n");
    const origEnv = Deno.env.get("NOW_FILE");
    if (origEnv !== undefined) Deno.env.delete("NOW_FILE");
    try {
      Deno.chdir(tmpDir);
      const out = await resolveFocusFilePath({ interactive: false });
      assertEquals(out, resolve(Deno.cwd(), fileName));
      assertEquals(await Deno.readTextFile(out), "- Root @\n");
    } finally {
      Deno.chdir(origCwd);
      if (origEnv !== undefined) Deno.env.set("NOW_FILE", origEnv);
      await Deno.remove(filePath).catch(() => { });
      await Deno.remove(tmpDir).catch(() => { });
    }
  },
);

Deno.test("resolveFocusFilePath - unset + no file + interactive false throws", async () => {
  const origEnv = Deno.env.get("NOW_FILE");
  Deno.env.delete("NOW_FILE");
  const tmpDir = await Deno.makeTempDir();
  const origCwd = Deno.cwd();
  try {
    Deno.chdir(tmpDir);
    const err = await assertRejects(
      () => resolveFocusFilePath({ interactive: false }),
      Error,
    );
    assert(err instanceof Error && err.message.includes("No focus file found"));
  } finally {
    Deno.chdir(origCwd);
    if (origEnv !== undefined) Deno.env.set("NOW_FILE", origEnv);
    await Deno.remove(tmpDir).catch(() => { });
  }
});

Deno.test(
  "findFocusFileInCwd - returns null when no matching file in cwd",
  { sanitizeOps: false },
  () => {
    const origCwd = Deno.cwd();
    const tmpDir = Deno.makeTempDirSync();
    try {
      Deno.chdir(tmpDir);
      const result = findFocusFileInCwd();
      assertEquals(result, null);
    } finally {
      Deno.chdir(origCwd);
      Deno.removeSync(tmpDir, { recursive: true });
    }
  },
);
