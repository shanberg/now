/**
 * Tests for readMarkdownFile and writeMarkdownFile (file I/O).
 */
import {
  assertRejects,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { INITIAL_FOCUS_CONTENT } from "../src/consts.ts";
import {
  ensureFocusFile,
  readMarkdownFile,
  writeMarkdownFile,
} from "../src/operations/index.ts";

Deno.test("writeMarkdownFile then readMarkdownFile round-trip", async () => {
  const path = await Deno.makeTempFile({ suffix: ".md" });
  const content = "- Root\n  - Child @\n";

  await writeMarkdownFile(content, path);
  const read = await readMarkdownFile(path);

  assertEquals(read, content);
  await Deno.remove(path);
});

Deno.test("readMarkdownFile - missing file returns empty string", async () => {
  const path = await Deno.makeTempFile({ suffix: ".md" });
  await Deno.remove(path);

  const content = await readMarkdownFile(path);

  assertEquals(content, "");
});

Deno.test("readMarkdownFile - empty path throws", async () => {
  await assertRejects(
    () => readMarkdownFile(""),
    Error,
    "Path is required",
  );
});

Deno.test("ensureFocusFile - creates file with initial content when missing", async () => {
  const dir = await Deno.makeTempDir();
  const path = `${dir}/focus.now.md`;

  await ensureFocusFile(path);

  const content = await readMarkdownFile(path);
  assertEquals(content, INITIAL_FOCUS_CONTENT);
  await Deno.remove(path);
  await Deno.remove(dir);
});

Deno.test("ensureFocusFile - no-op when file exists", async () => {
  const path = await Deno.makeTempFile({ suffix: ".now.md" });
  const existing = "- Other @\n";
  await writeMarkdownFile(existing, path);

  await ensureFocusFile(path);

  const content = await readMarkdownFile(path);
  assertEquals(content, existing);
  await Deno.remove(path);
});
