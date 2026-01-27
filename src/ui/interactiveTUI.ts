import {
  Input,
  Select,
} from "https://deno.land/x/cliffy@v0.25.7/prompt/mod.ts";
import { colors } from "https://deno.land/x/cliffy@v0.25.7/ansi/colors.ts";
import { D } from "../consts.ts";
import { TreeNode } from "../../types.d.ts";
import {
  createFocusFile,
  displayCurrentFocus,
  findOrCreateFocusFile,
  promptOptions,
  showHint,
  styleOptions,
  SYNTAX_HINT,
} from "./cliUtils.ts";
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
import { SelectOption } from "https://deno.land/x/cliffy@v0.25.7/prompt/select.ts";

/**
 * Runs the interactive text UI: finds or creates a focus file, loads the tree, then loops
 * prompting for actions (narrow, complete, add later, switch, edit, wrap, move, navigate) until quit.
 */
async function interactiveTUI() {
  D || console.clear();
  const focusFilePath = await findOrCreateFocusFile();
  if (!focusFilePath) {
    await createFocusFile(focusFilePath);
  }
  let tree = await getTree(focusFilePath);
  displayCurrentFocus(tree);

  while (true) {
    const action = await promptMainAction(tree);
    tree = await handleMainAction(action, focusFilePath);
    displayCurrentFocus(tree);
  }
}

/** Returns items if condition is true, otherwise an empty array. Used to conditionally include options. */
function when<T>(condition: boolean, ...items: T[]): T[] {
  return condition ? items : [];
}

/** Builds the main action menu options based on current focus (leaf/root/siblings). */
function buildMainActionOptions(
  isLeaf: boolean,
  isRoot: boolean,
  siblingCount: number,
): SelectOption[] {
  const base: SelectOption[] = [
    { name: "Narrow focus", value: "add", primary: true },
    { name: "Finish this", value: "complete", primary: true },
    { name: "Add followup", value: "later", primary: true },
    { name: "Switch", value: "switch" },
    { name: "Edit", value: "edit" },
    { name: "Wrap", value: "wrap" },
    { name: "Move", value: "move" },
  ];
  const nav: SelectOption[] = [
    ...when(!isLeaf, { name: "Dive in", value: "diveIn", primary: true }),
    ...when(siblingCount > 0, { name: "Next", value: "focusNextSibling" }, { name: "Previous", value: "focusPreviousSibling" }),
    ...when(!isLeaf, { name: "Down", value: "focusChild" }),
    ...when(!isRoot, { name: "Up", value: "focusParent" }),
  ];
  return [...base, ...nav];
}

/** Prompts the user to choose an action from the main menu. */
async function promptMainAction(tree: TreeNode): Promise<string> {
  D || console.clear();
  displayCurrentFocus(tree);
  const { isLeaf, isRoot, siblingCount } = getCurrentItemDetails(tree);
  const options = styleOptions(buildMainActionOptions(isLeaf, isRoot, siblingCount));
  return await Select.prompt({
    ...promptOptions,
    maxRows: 6,
    message: colors.dim("Actions"),
    options,
  });
}

/** Dispatches the chosen action and returns the updated tree. */
async function handleMainAction(
  action: string,
  path: string,
): Promise<TreeNode> {
  switch (action) {
    case "complete":
      return await handleCompleteAction(path);
    case "add":
      return await handleAddNestedAction(path);
    case "later":
      return await handleAddLater(path);
    case "switch":
      return await handleSwitchAction(path);
    case "diveIn":
      return await handleDiveInAction(path);
    case "edit":
      return await handleEditAction(path);
    case "wrap":
      return await handleWrapAction(path);
    case "move":
      return await handleMoveAction(path);
    case "focusNextSibling":
      return await handleNextSiblingAction(path);
    case "focusPreviousSibling":
      return await handlePreviousSiblingAction(path);
    case "focusChild":
      return await handleFocusChildAction(path);
    case "focusParent":
      return await handleFocusParentAction(path);
    case "quit":
      console.log("Exiting...");
      Deno.exit();
      break;
    default:
      return await getTree(path); // Return the current tree if action is unrecognized
  }
}

/** Runs the dive-in effect and returns the updated tree. */
async function handleDiveInAction(path: string): Promise<TreeNode> {
  await diveInEffect(path);
  return await getTree(path);
}

/** Marks the current item complete and returns the updated tree. */
async function handleCompleteAction(path: string): Promise<TreeNode> {
  await completeCurrentItemEffect(path);
  console.log("All focuses completed. Time for a break?");
  return await getTree(path);
}

/** Prompts for new items, runs the given effect, and returns the updated tree. */
async function handleAddItems(
  path: string,
  message: string,
  effect: (items: string, path: string) => Promise<void>,
): Promise<TreeNode> {
  D || console.clear();
  const tree = await getTree(path);
  displayCurrentFocus(tree);
  showHint(SYNTAX_HINT);
  const newItems = await Input.prompt({
    ...promptOptions,
    message,
  });
  await effect(newItems, path);
  return await getTree(path);
}

/** Adds nested focus items under the current item. */
async function handleAddNestedAction(path: string): Promise<TreeNode> {
  return handleAddItems(path, "Focus on:", createNestedChildrenEffect);
}

/** Adds a sibling "for later" after the current item. */
async function handleAddLater(path: string): Promise<TreeNode> {
  return handleAddItems(path, "Add for later:", addNextSiblingToCurrentItemEffect);
}

/** Moves focus to the next sibling. */
async function handleNextSiblingAction(path: string): Promise<TreeNode> {
  await focusNextSiblingEffect(path);
  return await getTree(path);
}

/** Moves focus to the previous sibling. */
async function handlePreviousSiblingAction(path: string): Promise<TreeNode> {
  await focusPreviousSiblingEffect(path);
  return await getTree(path);
}

/** Moves focus to the parent. */
async function handleFocusParentAction(path: string): Promise<TreeNode> {
  await focusParentEffect(path);
  return await getTree(path);
}

/** Moves focus to the first child. */
async function handleFocusChildAction(path: string): Promise<TreeNode> {
  await focusFirstChildEffect(path);
  return await getTree(path);
}

/** Prompts for a new name and updates the current item. */
async function handleEditAction(path: string): Promise<TreeNode> {
  const tree = await getTree(path);
  const { focusStr } = getCurrentItemDetails(tree);
  D || console.clear();
  displayCurrentFocus(tree);
  const newText = await Input.prompt({
    ...promptOptions,
    minLength: 1,
    default: focusStr,
    message: "New name:",
  });
  await editCurrentItemNameEffect(newText, path);
  return await getTree(path);
}

/** Prompts to pick another item as current (switch focus). */
async function handleSwitchAction(path: string): Promise<TreeNode> {
  D || console.clear();
  const tree = await getTree(path);
  displayCurrentFocus(tree);
  const items = await getItemsListEffect(path);
  const switchToKey = await Select.prompt({
    ...promptOptions,
    message: "Select a focus to switch to:",
    options: [
      ...items.map(([name, key]: [string, string]) => ({
        name: name,
        value: key,
      })),
      Select.separator(),
      { name: "Go Back", value: "back" },
    ],
  });

  if (switchToKey !== "back") {
    console.log("Switching to " + switchToKey);
    await setCurrentItemEffect(switchToKey, path);
  }
  return await getTree(path);
}

/** Prompts for a parent name and wraps the current item in a new parent. */
async function handleWrapAction(path: string): Promise<TreeNode> {
  D || console.clear();
  const tree = await getTree(path);
  displayCurrentFocus(tree);
  const newParentName = await Input.prompt({
    ...promptOptions,
    message: "New parent name:",
  });
  await wrapCurrentItemInNewParentEffect(newParentName, path);
  return await getTree(path);
}

/** Prompts to choose a new parent and moves the current item there. */
async function handleMoveAction(path: string): Promise<TreeNode> {
  D || console.clear();
  const tree = await getTree(path);
  const items = getItemsList(tree);
  const { key: currentKey } = getCurrentItemDetails(tree);

  const moveToKey = await Select.prompt({
    ...promptOptions,
    message: "Select a new parent for the current item:",
    options: [
      ...items
        .filter(([_, key]) => key !== currentKey) // Disable the current item
        .map(([name, key]: [string, string]) => ({
          name: name,
          value: key,
        })),
      Select.separator(),
      { name: "Go Back", value: "back" },
    ],
  });

  if (moveToKey !== "back") {
    await moveNodeToNewParentEffect(currentKey, moveToKey, path);
  }
  return await getTree(path);
}

export { interactiveTUI };
