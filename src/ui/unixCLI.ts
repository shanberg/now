/**
 * @fileoverview Unix-style CLI entry: single command + positional args, optional JSON output.
 */
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

type Tree = Awaited<ReturnType<typeof getTree>>;

/** Writes { focus, items } JSON to stdout for the given tree. */
function emitJsonFromTree(tree: Tree): void {
  const d = getCurrentItemDetails(tree);
  const focus: JsonFocus = {
    focus: d.focusStr,
    breadcrumb: d.breadcrumbStr,
    key: d.key,
    isLeaf: d.isLeaf,
    isRoot: d.isRoot,
    siblingCount: d.siblingCount,
  };
  const items: JsonItem[] = getItemsList(tree).map(
    ([display, key]: [string, string]) => ({
      display,
      key,
    }),
  );
  console.log(JSON.stringify({ focus, items }));
}

/** Parses (optionsOrFirstArg, ...rest) into { emitJson, positionalArgs } for unixCLI. */
function parseUnixCLIArgs(
  optionsOrFirstArg?: { emitJson?: boolean } | string,
  ...rest: string[]
): { emitJson: boolean; positionalArgs: string[] } {
  if (optionsOrFirstArg == null) {
    return { emitJson: false, positionalArgs: rest };
  }
  if (typeof optionsOrFirstArg === "object") {
    const emitJson = "emitJson" in optionsOrFirstArg && optionsOrFirstArg.emitJson === true;
    return { emitJson, positionalArgs: rest };
  }
  return {
    emitJson: false,
    positionalArgs: [optionsOrFirstArg, ...rest],
  };
}

/** Runs the effect; if emitJson, also emits tree as JSON to stdout. */
async function runAndMaybeEmitTree(
  emitJson: boolean,
  run: () => Promise<Tree>,
): Promise<void> {
  const tree = await run();
  if (emitJson) emitJsonFromTree(tree);
}

/** (focusFilePath, positionalArgs, emitJson) => Promise<void>. */
type CommandHandler = (
  focusFilePath: string,
  positionalArgs: string[],
  emitJson: boolean,
) => Promise<void>;

/** Map of command name to handler for status, complete, add, later, edit, switch, wrap, move, dive-in, next, previous, down, up. */
function buildCommandHandlers(): Record<string, CommandHandler> {
  return {
    status: async (focusFilePath) => {
      await displayCurrentFocusEffect(focusFilePath);
    },
    complete: (focusFilePath, _positionalArgs, emitJson) =>
      runAndMaybeEmitTree(emitJson, () =>
        completeCurrentItemEffect(focusFilePath)),
    add: (focusFilePath, positionalArgs, emitJson) =>
      runAndMaybeEmitTree(emitJson, () =>
        createNestedChildrenEffect(focusFilePath, positionalArgs[0])),
    later: (focusFilePath, positionalArgs, emitJson) =>
      runAndMaybeEmitTree(emitJson, () =>
        addNextSiblingToCurrentItemEffect(focusFilePath, positionalArgs[0])),
    edit: (focusFilePath, positionalArgs, emitJson) =>
      runAndMaybeEmitTree(emitJson, () =>
        editCurrentItemNameEffect(focusFilePath, positionalArgs[0])),
    switch: (focusFilePath, positionalArgs, emitJson) =>
      runAndMaybeEmitTree(emitJson, () =>
        setCurrentItemEffect(focusFilePath, positionalArgs[0])),
    wrap: (focusFilePath, positionalArgs, emitJson) =>
      runAndMaybeEmitTree(emitJson, () =>
        wrapCurrentItemInNewParentEffect(positionalArgs[0], focusFilePath)),
    move: async (focusFilePath, positionalArgs, emitJson) => {
      const tree = await getTree(focusFilePath);
      const { key: currentKey } = getCurrentItemDetails(tree);
      await runAndMaybeEmitTree(emitJson, () =>
        moveNodeToNewParentEffectWithTree(
          focusFilePath,
          tree,
          currentKey,
          positionalArgs[0],
        ));
    },
    "dive-in": (focusFilePath) => diveInEffect(focusFilePath),
    next: (focusFilePath) => focusNextSiblingEffect(focusFilePath),
    previous: (focusFilePath) => focusPreviousSiblingEffect(focusFilePath),
    down: (focusFilePath) => focusFirstChildEffect(focusFilePath),
    up: (focusFilePath) => focusParentEffect(focusFilePath),
  };
}

const COMMAND_HANDLERS = buildCommandHandlers();

/** Resolves focus file path; on error logs to stderr and exits 1. */
async function resolveFocusPathOrExit(): Promise<string> {
  try {
    return await resolveFocusFilePath({ interactive: false });
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    Deno.exit(1);
  }
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
  ...rest: string[]
): Promise<void> {
  const { emitJson, positionalArgs } = parseUnixCLIArgs(
    optionsOrFirstArg,
    ...rest,
  );
  const focusFilePath = await resolveFocusPathOrExit();
  const handler = COMMAND_HANDLERS[command];
  if (!handler) {
    console.error(`Unknown command: ${command}`);
    Deno.exit(1);
  }
  await handler(focusFilePath, positionalArgs, emitJson);
}

export { unixCLI };
