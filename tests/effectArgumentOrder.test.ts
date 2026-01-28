/**
 * Tests that effects are called with correct argument order: (path, ...args).
 * Regressions: calling (arg, path) causes "Root node not found" because the
 * effect treats user input as the file path.
 */
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  addNextSiblingToCurrentItemEffect,
  completeCurrentItemEffect,
  createNestedChildrenEffect,
  editCurrentItemNameEffect,
  getTree,
  setCurrentItemEffect,
} from "../src/operations/index.ts";

const INITIAL_ADD_LATER = `- Root
  - Item 1 @
  - Item 2
`;

const INITIAL_SWITCH = `- Root
  - Alpha
  - Beta @
  - Gamma
`;

const INITIAL_EDIT = `- Root
  - Item 1 @
  - Item 2
`;

const INITIAL_ADD_NESTED = `- Root
  - Current @
`;

const INITIAL_COMPLETE = `- Root
  - Alpha
  - Beta @
  - Gamma
`;

Deno.test("createNestedChildrenEffect - path first (Add focus)", async () => {
  const path = await Deno.makeTempFile({ suffix: ".md" });
  await Deno.writeTextFile(path, INITIAL_ADD_NESTED);

  await createNestedChildrenEffect(path, "A / B");

  const tree = await getTree(path);
  const current = tree.children!.find((c) => c.name === "Current");
  assertEquals(current!.children.length, 1);
  assertEquals(current!.children[0].name, "A");
  assertEquals(current!.children[0].children.length, 1);
  assertEquals(current!.children[0].children[0].name, "B");

  await Deno.remove(path);
});

Deno.test("completeCurrentItemEffect - path first (Complete)", async () => {
  const path = await Deno.makeTempFile({ suffix: ".md" });
  await Deno.writeTextFile(path, INITIAL_COMPLETE);

  await completeCurrentItemEffect(path);

  const tree = await getTree(path);
  const names = tree.children!.map((c) => c.name);
  assertEquals(names, ["Alpha", "Gamma"]);
  const beta = tree.children!.find((c) => c.name === "Beta");
  assertEquals(beta, undefined);

  await Deno.remove(path);
});

Deno.test("addNextSiblingToCurrentItemEffect - path first (Add for later)", async () => {
  const path = await Deno.makeTempFile({ suffix: ".md" });
  await Deno.writeTextFile(path, INITIAL_ADD_LATER);

  await addNextSiblingToCurrentItemEffect(path, "Item 1.5");

  const tree = await getTree(path);
  const names = tree.children!.map((c) => c.name);
  assertEquals(names, ["Item 1", "Item 1.5", "Item 2"]);

  await Deno.remove(path);
});

Deno.test("setCurrentItemEffect - path first (Switch focus)", async () => {
  const path = await Deno.makeTempFile({ suffix: ".md" });
  await Deno.writeTextFile(path, INITIAL_SWITCH);

  await setCurrentItemEffect(path, "1"); // switch to Alpha (key "1")

  const tree = await getTree(path);
  const alpha = tree.children!.find((c) => c.key === "1");
  const beta = tree.children!.find((c) => c.key === "2");
  assertEquals(alpha!.isCurrent, true);
  assertEquals(beta!.isCurrent, false);

  await Deno.remove(path);
});

Deno.test("editCurrentItemNameEffect - path first (Edit name)", async () => {
  const path = await Deno.makeTempFile({ suffix: ".md" });
  await Deno.writeTextFile(path, INITIAL_EDIT);

  await editCurrentItemNameEffect(path, "Item 1 renamed");

  const tree = await getTree(path);
  const edited = tree.children!.find((c) => c.key === "1");
  assertEquals(edited!.name, "Item 1 renamed");

  await Deno.remove(path);
});
