/**
 * JSON and init entry points without loading cliUtils (and thus cliffy).
 * Used when cmd is "json" or "init" so the slim path never loads prompt/colors.
 */
import { resolve } from "std/path/mod.ts";
import {
  buildPreviewMarkdown,
  type PreviewAction,
  PREVIEW_ACTION_VALUES,
} from "now-format";
import { resolveFocusFilePath } from "./resolveFocus.ts";
import { ensureFocusFile } from "../operations/fileOperations.ts";
import {
  getCurrentItemDetails,
  getItemsList,
  getTree,
  moveNodeToNewParent,
} from "../operations/index.ts";

/** Logs error to stderr and exits with code 1. */
function logErrorAndExit(err: unknown): never {
  console.error(err instanceof Error ? err.message : err);
  Deno.exit(1);
}

/** Creates focus file at NOW_FILE if missing. Optional root name (e.g. app name). Requires NOW_FILE. Exits 1 on error. */
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
    logErrorAndExit(err);
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
    logErrorAndExit(err);
  }
}

/** Normalizes CLI action string to PreviewAction or null if invalid/empty. */
function toPreviewAction(action: string | undefined): PreviewAction {
  if (!action?.trim()) return null;
  const valid = PREVIEW_ACTION_VALUES as readonly string[];
  if (!valid.includes(action)) return null;
  return action as PreviewAction;
}

/** Loads tree from path; if moveTargetKey is set, moves current focus to that key and returns updated tree. */
async function loadTreeForPreview(
  path: string,
  moveTargetKey: string | undefined,
) {
  const tree = await getTree(path);
  const needMove = moveTargetKey !== undefined && moveTargetKey !== "";
  if (!needMove) return tree;
  const d = getCurrentItemDetails(tree);
  return moveNodeToNewParent(tree, d.key, moveTargetKey!);
}

/** Resolves focus file path for preview; exits 1 on error. */
async function resolvePreviewPathOrExit(): Promise<string> {
  try {
    return await resolveFocusFilePath({ interactive: false });
  } catch (err) {
    logErrorAndExit(err);
  }
}

/** Loads tree (optionally moving focus), builds preview markdown with given selectedKey/action, logs to stdout. */
function buildAndLogPreview(
  path: string,
  moveTargetKey: string | undefined,
  selectedKey: string | undefined,
  action: string | undefined,
): Promise<void> {
  return loadTreeForPreview(path, moveTargetKey).then((tree) => {
    const d = getCurrentItemDetails(tree);
    const items = getItemsList(tree).map(([display, key]) => ({ display, key }));
    const markdown = buildPreviewMarkdown(
      items,
      d.key,
      d.breadcrumbStr,
      d.focusStr,
      selectedKey ?? null,
      toPreviewAction(action),
    );
    console.log(markdown);
  });
}

/** Outputs preview markdown to stdout. Optional --selected-key, --action (complete|add|later|wrap|edit), or --move-target KEY. Exits 1 on error. */
export async function runJsonPreview(
  selectedKey?: string,
  action?: string,
  moveTargetKey?: string,
): Promise<void> {
  const path = await resolvePreviewPathOrExit();
  try {
    await buildAndLogPreview(path, moveTargetKey, selectedKey, action);
  } catch (err) {
    logErrorAndExit(err);
  }
}
