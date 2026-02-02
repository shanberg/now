/**
 * Tests for json focus and json items CLI output.
 */
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { resolve } from "std/path/mod.ts";

const CLI = [
  Deno.execPath(),
  "run",
  "--allow-read",
  "--allow-write",
  "--allow-env",
  resolve(Deno.cwd(), "src/index.ts"),
];

const FIXTURE = `- Root
  - Alpha
  - Beta @
  - Gamma
`;

Deno.test("json focus - stdout is valid JSON with focus, breadcrumb, key, isLeaf, isRoot", async () => {
  const tmp = await Deno.makeTempFile({ suffix: ".now.md" });
  await Deno.writeTextFile(tmp, FIXTURE);
  const orig = Deno.env.get("NOW_FILE");
  try {
    Deno.env.set("NOW_FILE", tmp);
    const p = await new Deno.Command(CLI[0], {
      args: [...CLI.slice(1), "json", "focus"],
      cwd: Deno.cwd(),
      env: { NOW_FILE: tmp, ...Deno.env.toObject() },
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(p.code, 0);
    const out = new TextDecoder().decode(p.stdout).trim();
    const parsed = JSON.parse(out) as Record<string, unknown>;
    assertEquals(parsed.focus, "Beta");
    assertEquals(typeof parsed.breadcrumb, "string");
    assertEquals(parsed.key, "2");
    assertEquals(parsed.isLeaf, true);
    assertEquals(parsed.isRoot, false);
  } finally {
    if (orig !== undefined) Deno.env.set("NOW_FILE", orig);
    else Deno.env.delete("NOW_FILE");
    await Deno.remove(tmp).catch(() => { });
  }
});

Deno.test("json items - stdout is valid JSON array of { display, key }", async () => {
  const tmp = await Deno.makeTempFile({ suffix: ".now.md" });
  await Deno.writeTextFile(tmp, FIXTURE);
  const orig = Deno.env.get("NOW_FILE");
  try {
    Deno.env.set("NOW_FILE", tmp);
    const p = await new Deno.Command(CLI[0], {
      args: [...CLI.slice(1), "json", "items"],
      cwd: Deno.cwd(),
      env: { NOW_FILE: tmp, ...Deno.env.toObject() },
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(p.code, 0);
    const out = new TextDecoder().decode(p.stdout).trim();
    const parsed = JSON.parse(out) as Array<{ display: string; key: string }>;
    assertEquals(Array.isArray(parsed), true);
    assertEquals(parsed.length, 4);
    assertEquals(parsed[0].display, "Root");
    assertEquals(parsed[0].key, "0");
    assertEquals(parsed[2].display.includes("Beta") && parsed[2].display.includes("@"), true);
    assertEquals(parsed[2].key, "2");
  } finally {
    if (orig !== undefined) Deno.env.set("NOW_FILE", orig);
    else Deno.env.delete("NOW_FILE");
    await Deno.remove(tmp).catch(() => { });
  }
});

Deno.test("json focus - exits 1 when no file and no NOW_FILE", async () => {
  const orig = Deno.env.get("NOW_FILE");
  if (orig !== undefined) Deno.env.delete("NOW_FILE");
  const tmpDir = await Deno.makeTempDir();
  try {
    const p = await new Deno.Command(CLI[0], {
      args: [...CLI.slice(1), "json", "focus"],
      cwd: tmpDir,
      env: { ...Deno.env.toObject() },
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(p.code, 1);
    const err = new TextDecoder().decode(p.stderr).trim();
    assertEquals(err.includes("No focus file found"), true);
  } finally {
    if (orig !== undefined) Deno.env.set("NOW_FILE", orig);
    await Deno.remove(tmpDir).catch(() => { });
  }
});
