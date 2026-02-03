import type { JsonFocus, JsonItem } from "now-format";
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
  getItemsList,
  getTree,
  moveNodeToNewParentEffectWithTree,
  setCurrentItemEffect,
  wrapCurrentItemInNewParentEffect,
} from "../operations/index.ts";

function emitJsonFromTree(tree: Awaited<ReturnType<typeof getTree>>): void {
  const d = getCurrentItemDetails(tree);
  const focus: JsonFocus = {
    focus: d.focusStr,
    breadcrumb: d.breadcrumbStr,
    key: d.key,
    isLeaf: d.isLeaf,
    isRoot: d.isRoot,
    siblingCount: d.siblingCount,
  };
  const items: JsonItem[] = getItemsList(tree).map(([display, key]) => ({
    display,
    key,
  }));
  console.log(JSON.stringify({ focus, items }));
}

/**
 * Runs a single CLI command against the focus file.
 * @param command - One of: status, complete, add, later, edit, switch, wrap, move, dive-in, next, previous, down, up.
 * @param optionsOrFirstArg - Optional { emitJson: true } or first positional arg.
 * @param positionalArgs - Command-specific arguments (e.g. item text, key).
 */
async function unixCLI(
  command: string,
  optionsOrFirstArg?: { emitJson?: boolean } | string,
  ...rest: string[],
) {
  const options =
    optionsOrFirstArg != null &&
      typeof optionsOrFirstArg === "object" &&
      "emitJson" in optionsOrFirstArg
      ? optionsOrFirstArg
      : undefined;
  const positionalArgs = options
    ? rest
    : optionsOrFirstArg !== undefined
      ? [optionsOrFirstArg, ...rest]
      : rest;

  let focusFilePath: string;
  try {
    focusFilePath = await resolveFocusFilePath({ interactive: false });
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    Deno.exit(1);
  }

  const emitJson = options?.emitJson === true;

  switch (command) {
    case "status":
      await displayCurrentFocusEffect(focusFilePath);
      break;
    case "complete": {
      const tree = await completeCurrentItemEffect(focusFilePath);
      if (emitJson) emitJsonFromTree(tree);
      break;
    }
    case "add": {
      const tree = await createNestedChildrenEffect(
        focusFilePath,
        positionalArgs[0],
      );
      if (emitJson) emitJsonFromTree(tree);
      break;
    }
    case "later": {
      const tree = await addNextSiblingToCurrentItemEffect(
        focusFilePath,
        positionalArgs[0],
      );
      if (emitJson) emitJsonFromTree(tree);
      break;
    }
    case "edit": {
      const tree = await editCurrentItemNameEffect(
        focusFilePath,
        positionalArgs[0],
      );
      if (emitJson) emitJsonFromTree(tree);
      break;
    }
    case "switch": {
      const tree = await setCurrentItemEffect(
        focusFilePath,
        positionalArgs[0],
      );
      if (emitJson) emitJsonFromTree(tree);
      break;
    }
    case "wrap": {
      const tree = await wrapCurrentItemInNewParentEffect(
        positionalArgs[0],
        focusFilePath,
      );
      if (emitJson) emitJsonFromTree(tree);
      break;
    }
    case "move": {
      const tree = await getTree(focusFilePath);
      const { key: currentKey } = getCurrentItemDetails(tree);
      const newTree = await moveNodeToNewParentEffectWithTree(
        focusFilePath,
        tree,
        currentKey,
        positionalArgs[0],
      );
      if (emitJson) emitJsonFromTree(newTree);
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
