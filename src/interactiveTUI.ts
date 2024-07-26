import {
  Input,
  Select,
} from "https://deno.land/x/cliffy@v0.25.7/prompt/mod.ts";
import { colors } from "https://deno.land/x/cliffy@v0.25.7/ansi/colors.ts";
import {
  createFrameFile,
  displayCurrentFocus,
  findOrCreateFrameFile,
  promptOptions,
  SEPARATOR_STR,
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
  focusNextSiblingEffect,
  focusPreviousSiblingEffect,
  getCurrentItemDetails,
  getItemsList,
  getItemsListEffect,
  getTree,
  moveNodeToNewParentEffect,
  setCurrentItemEffect,
  wrapCurrentItemInNewParentEffect,
} from "./operations/index.ts";
import { D } from "./consts.ts";

async function interactiveTUI(path?: string) {
  D || console.clear();
  const frameFilePath = path || (await findOrCreateFrameFile());
  if (!path && !frameFilePath) {
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
  const { isLeaf, siblingCount } = getCurrentItemDetails(tree);

  const options = styleOptions([
    !isLeaf && { name: "Dive in", value: "diveIn" },
    { name: "Narrow focus", value: "add" },
    { name: "Finish this", value: "complete" },
    { name: "Add followup", value: "later" },
    Select.separator(SEPARATOR_STR),
    { name: "Switch focus", value: "switch" },
    { name: "Edit focus", value: "edit" },
    { name: "Wrap in new parent", value: "wrap" },
    { name: "Move to new parent", value: "move" },
    siblingCount > 1 && { name: "Next", value: "nextSibling" },
    siblingCount > 1 && { name: "Prev", value: "previousSibling" },
  ]).filter(Boolean);

  return await Select.prompt({
    ...promptOptions,
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
    case "nextSibling":
      return await handleNextSiblingAction(path);
    case "previousSibling":
      return await handlePreviousSiblingAction(path);
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

async function handleEditAction(path: string): Promise<TreeNode> {
  const tree = await getTree(path);
  const currentItem = getCurrentFocus(tree).focusStr;
  D || console.clear();
  displayCurrentFocus(tree);
  const newText = await Input.prompt({
    ...promptOptions,
    minLength: 1,
    default: currentItem,
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
