/**
 * JSON and init entry points without loading cliUtils (and thus cliffy).
 * Used when cmd is "json" or "init" so the slim path never loads prompt/colors.
 */
import { resolve } from "std/path/mod.ts";
import { buildPreviewMarkdown, PREVIEW_ACTION_VALUES } from "now-format";
import { resolveFocusFilePath } from "./resolveFocus.ts";
import { ensureFocusFile } from "../operations/fileOperations.ts";
import {
  getCurrentItemDetails,
  getItemsList,
  getTree,
  moveNodeToNewParent,
} from "../operations/index.ts";

/** Creates focus file at NOW_FILE if missing. Optional root name (e.g. app/document name). Requires NOW_FILE. Exits 1 on error. */
export async function runInit(rootName?: string): Promise<void> {
  const fromEnv = Deno.env.get("NOW_FILE");
  if (!fromEnv?.trim()) {
    console.error("NOW_FILE is required for init.");
    Deno.exit(1);
  }
  const path = resolve(Deno.cwd(), fromEnv);
  await ensureFocusFile(path, rootName);
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

/** Outputs preview markdown to stdout. Optional --selected-key, --action (complete|add|later|wrap|edit), or --move-target KEY. Exits 1 on error. */
export async function runJsonPreview(
  selectedKey?: string,
  action?: string,
  moveTargetKey?: string,
): Promise<void> {
  try {
    const path = await resolveFocusFilePath({ interactive: false });
    let tree = await getTree(path);
    if (moveTargetKey !== undefined && moveTargetKey !== "") {
      const d = getCurrentItemDetails(tree);
      tree = moveNodeToNewParent(tree, d.key, moveTargetKey);
    }
    const d = getCurrentItemDetails(tree);
    const items = getItemsList(tree).map(([display, key]) => ({ display, key }));
    const previewAction =
      action && PREVIEW_ACTION_VALUES.includes(action as (typeof PREVIEW_ACTION_VALUES)[number])
        ? (action as (typeof PREVIEW_ACTION_VALUES)[number])
        : null;
    const markdown = buildPreviewMarkdown(
      items,
      d.key,
      d.breadcrumbStr,
      d.focusStr,
      selectedKey ?? null,
      previewAction,
    );
    console.log(markdown);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    Deno.exit(1);
  }
}
