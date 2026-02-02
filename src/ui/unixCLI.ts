import { displayCurrentFocusEffect } from "./cliUtils.ts";
import { resolveFocusFilePath } from "./resolveFocus.ts";
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
  getTree,
  moveNodeToNewParentEffectWithTree,
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
      await moveNodeToNewParentEffectWithTree(
        focusFilePath,
        tree,
        currentKey,
        args[0],
      );
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

export { unixCLI };
