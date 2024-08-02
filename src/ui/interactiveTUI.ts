import {
  Input,
  Select,
} from "https://deno.land/x/cliffy@v0.25.7/prompt/mod.ts";
import { colors } from "https://deno.land/x/cliffy@v0.25.7/ansi/colors.ts";
import { D } from "../consts.ts";
import { TreeNode } from "../../types.d.ts";
import {
  createFrameFile,
  displayCurrentFocus,
  findOrCreateFrameFile,
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

async function interactiveTUI() {
  D || console.clear();
  const frameFilePath = await findOrCreateFrameFile();
  if (!frameFilePath) {
    await createFrameFile(frameFilePath);
  }
  let tree = await getTree(frameFilePath);
  displayCurrentFocus(tree);

  while (true) {
    const action = await promptMainAction(tree);
    tree = await handleMainAction(action, frameFilePath);
    displayCurrentFocus(tree);
  }
}

async function promptMainAction(tree: TreeNode): Promise<string> {
  D || console.clear();
  displayCurrentFocus(tree);
  const { isLeaf, isRoot, siblingCount } = getCurrentItemDetails(tree);

  const availableOptions = [
    !isLeaf && { name: "Dive in", value: "diveIn", primary: true },
    { name: "Narrow focus", value: "add", primary: true },
    { name: "Finish this", value: "complete", primary: true },
    { name: "Add followup", value: "later", primary: true },
    { name: "Switch", value: "switch" },
    { name: "Edit", value: "edit" },
    { name: "Wrap", value: "wrap" },
    { name: "Move", value: "move" },
    siblingCount > 0 && { name: "Next", value: "focusNnextSibling" },
    siblingCount > 0 && { name: "Previous", value: "focusPreviousSibling" },
    !isLeaf && { name: "Down", value: "focusChild" },
    !isRoot && { name: "Up", value: "focusParent" },
  ].filter((option) => !!option);

  const options = styleOptions(availableOptions as SelectOption[]);

  return await Select.prompt({
    ...promptOptions,
    maxRows: 6,
    message: colors.dim("Actions"),
    options,
  });
}

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

async function handleDiveInAction(path: string): Promise<TreeNode> {
  await diveInEffect(path);
  return await getTree(path);
}

async function handleCompleteAction(path: string): Promise<TreeNode> {
  await completeCurrentItemEffect(path);
  console.log("All Frames completed. Time for a break?");
  return await getTree(path);
}

async function handleAddNestedAction(path: string): Promise<TreeNode> {
  D || console.clear();
  const tree = await getTree(path);
  displayCurrentFocus(tree);
  showHint(SYNTAX_HINT);
  const newItems = await Input.prompt({
    ...promptOptions,
    message: "Focus on:",
  });
  await createNestedChildrenEffect(newItems, path);
  return await getTree(path);
}

async function handleAddLater(path: string): Promise<TreeNode> {
  D || console.clear();
  const tree = await getTree(path);
  displayCurrentFocus(tree);
  showHint(SYNTAX_HINT);
  const newItems = await Input.prompt({
    ...promptOptions,
    message: "Add for later:",
  });
  await addNextSiblingToCurrentItemEffect(newItems, path);
  return await getTree(path);
}

async function handleNextSiblingAction(path: string): Promise<TreeNode> {
  await focusNextSiblingEffect(path);
  return await getTree(path);
}

async function handlePreviousSiblingAction(path: string): Promise<TreeNode> {
  await focusPreviousSiblingEffect(path);
  return await getTree(path);
}

async function handleFocusParentAction(path: string): Promise<TreeNode> {
  await focusParentEffect(path);
  return await getTree(path);
}

async function handleFocusChildAction(path: string): Promise<TreeNode> {
  await focusFirstChildEffect(path);
  return await getTree(path);
}

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
