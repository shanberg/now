import {
  displayCurrentFocusEffect,
  resolveFocusFilePath,
} from "./cliUtils.ts";
import { ensureFocusFile } from "../operations/fileOperations.ts";
import { resolve } from "std/path/mod.ts";
import {
  addNextSiblingToCurrentItemEffect,
  completeCurrentItemEffect,
  createNestedChildrenEffect,
  diveInEffect,
  editCurrentItemNameEffect,
  focusFirstChildEffect,
  focusNextSiblingEffect,
  focusParentEffect,
  focusPreviousSiblingEffect,
  getCurrentItemDetails,
  getItemsList,
  getItemsListEffect,
  getTree,
  moveNodeToNewParentEffect,
  setCurrentItemEffect,
  wrapCurrentItemInNewParentEffect,
} from "../operations/index.ts";

/**
 * Runs a single CLI command against the focus file.
 * @param {string} command - One of: status, complete, add, later, edit, switch, wrap, move, dive-in, next, previous, down, up.
 * @param {...string} args - Arguments for the command (e.g. item text, index).
 */
async function unixCLI(command: string, ...args: string[]) {
  let focusFilePath: string;
  try {
    focusFilePath = await resolveFocusFilePath({ interactive: false });
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    Deno.exit(1);
  }
  switch (command) {
    case "status":
      await displayCurrentFocusEffect(focusFilePath);
      break;
    case "complete":
      await completeCurrentItemEffect(focusFilePath);
      break;
    case "add":
      await createNestedChildrenEffect(focusFilePath, args[0]);
      break;
    case "later":
      await addNextSiblingToCurrentItemEffect(focusFilePath, args[0]);
      break;
    case "edit":
      await editCurrentItemNameEffect(focusFilePath, args[0]);
      break;
    case "switch":
      await setCurrentItemEffect(focusFilePath, args[0]);
      break;
    case "wrap":
      await wrapCurrentItemInNewParentEffect(args[0], focusFilePath);
      break;
    case "move": {
      const tree = await getTree(focusFilePath);
      const { key: currentKey } = getCurrentItemDetails(tree);
      await moveNodeToNewParentEffect(currentKey, args[0], focusFilePath);
      break;
    }
    case "dive-in":
      await diveInEffect(focusFilePath);
      break;
    case "next":
      await focusNextSiblingEffect(focusFilePath);
      break;
    case "previous":
      await focusPreviousSiblingEffect(focusFilePath);
      break;
    case "down":
      await focusFirstChildEffect(focusFilePath);
      break;
    case "up":
      await focusParentEffect(focusFilePath);
      break;
    default:
      break;
  }
}

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

export { unixCLI };
