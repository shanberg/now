/**
 * JSON and init entry points without loading cliUtils (and thus cliffy).
 * Used when cmd is "json" or "init" so the slim path never loads prompt/colors.
 */
import { resolve } from "std/path/mod.ts";
import { resolveFocusFilePath } from "./resolveFocus.ts";
import { ensureFocusFile } from "../operations/fileOperations.ts";
import {
  getCurrentItemDetails,
  getItemsList,
  getTree,
} from "../operations/index.ts";

/** Creates focus file at NOW_FILE if missing. Requires NOW_FILE. Exits 1 on error. */
export async function runInit(): Promise<void> {
  const fromEnv = Deno.env.get("NOW_FILE");
  if (!fromEnv?.trim()) {
    console.error("NOW_FILE is required for init.");
    Deno.exit(1);
  }
  const path = resolve(Deno.cwd(), fromEnv);
  await ensureFocusFile(path);
}

/** Outputs current focus as JSON to stdout. Exits 1 on error. */
export async function runJsonFocus(): Promise<void> {
  try {
    const path = await resolveFocusFilePath({ interactive: false });
    const tree = await getTree(path);
    const d = getCurrentItemDetails(tree);
    console.log(
      JSON.stringify({
        focus: d.focusStr,
        breadcrumb: d.breadcrumbStr,
        key: d.key,
        isLeaf: d.isLeaf,
        isRoot: d.isRoot,
        siblingCount: d.siblingCount,
      }),
    );
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    Deno.exit(1);
  }
}

/** Outputs focusable items as JSON array to stdout. Exits 1 on error. */
export async function runJsonItems(): Promise<void> {
  try {
    const path = await resolveFocusFilePath({ interactive: false });
    const tree = await getTree(path);
    const items = getItemsList(tree);
    console.log(
      JSON.stringify(items.map(([display, key]) => ({ display, key }))),
    );
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    Deno.exit(1);
  }
}
