import {
  Input,
  Select,
} from "https://deno.land/x/cliffy@v0.25.7/prompt/mod.ts";
import { colors } from "https://deno.land/x/cliffy@v0.25.7/ansi/colors.ts";
import {
  createFrameFile,
  findOrCreateFrameFile,
  promptOptions,
  showHint,
  SYNTAX_HINT,
} from "./cliUtils.ts";

import {
  addNextSiblingToCurrentItemEffect,
  completeCurrentItemEffect,
  createNestedChildrenEffect,
  editCurrentItemNameEffect,
  getCurrentFocus,
  getItemsListEffect,
  getTree,
  setCurrentItemEffect,
} from "./frame.ts";

const d = false; // debug mode

const FOCUS_ARROW = "▶︎";

function displayCurrentFocus(tree: TreeNode): void {
  d || console.clear();
  const { breadcrumbStr, focusStr } = getCurrentFocus(tree);
  const trimmedBread = breadcrumbStr.split(" / ").slice(1).join(" / ");

  console.log(colors.dim(trimmedBread + " /"));
  console.log(colors.yellow(`${FOCUS_ARROW} ${focusStr}`));
  console.log();
}

async function interactiveTUI(path?: string) {
  d || console.clear();
  const frameFilePath = path || await findOrCreateFrameFile();
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

async function promptMainAction(
  tree: TreeNode,
): Promise<string> {
  d || console.clear();
  displayCurrentFocus(tree);
  return await Select.prompt({
    ...promptOptions,
    message: colors.dim("Actions"),
    options: [
      { name: "Finish this", value: "complete" },
      { name: "Narrow focus", value: "add" },
      { name: "Add followup", value: "later" },
      { name: "more…", value: "more" },
    ],
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
    case "more":
      return await handleMoreAction(path);
    default:
      return await getTree(path); // Return the current tree if action is unrecognized
  }
}

async function handleCompleteAction(path: string): Promise<TreeNode> {
  await completeCurrentItemEffect(path);
  console.log("All Frames completed. Time for a break?");
  return await getTree(path);
}

async function handleAddNestedAction(path: string): Promise<TreeNode> {
  d || console.clear();
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
  d || console.clear();
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

async function handleMoreAction(path: string): Promise<TreeNode> {
  d || console.clear();
  const tree = await getTree(path);
  displayCurrentFocus(tree);
  const moreAction = await Select.prompt({
    ...promptOptions,
    message: "More Options",
    options: [
      { name: "Edit current focus", value: "edit" },
      { name: "Switch focus", value: "switch" },
      { name: "Go back", value: "back" },
      { name: "Quit", value: "quit" },
    ],
  });

  switch (moreAction) {
    case "edit":
      return await handleEditAction(path);
    case "switch":
      return await handleSwitchAction(path);
    case "back":
      return tree; // Go back to the previous menu
    case "quit":
      console.log("Exiting...");
      Deno.exit();
      break;
  }
  return tree;
}

async function handleEditAction(path: string): Promise<TreeNode> {
  const tree = await getTree(path);
  const currentItem = getCurrentFocus(tree).focusStr;
  d || console.clear();
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
  d || console.clear();
  const tree = await getTree(path);
  displayCurrentFocus(tree);
  const items = await getItemsListEffect(path);
  const switchToKey = await Select.prompt({
    ...promptOptions,
    search: true,
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

export { interactiveTUI };
