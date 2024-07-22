import {
  Input,
  Select,
} from "https://deno.land/x/cliffy@v0.25.7/prompt/mod.ts";
import { colors } from "https://deno.land/x/cliffy@v0.25.7/ansi/colors.ts";
import {
  createFrameFile,
  displayStatus,
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
  getCurrentItemBreadcrumbEffect,
  getItemsListEffect,
  getNodesListEffect,
  setCurrentItemEffect,
} from "./frame.ts";

const d = false;

async function interactiveTUI(path?: string) {
  d && console.clear();
  const frameFilePath = path || await findOrCreateFrameFile();
  if (!path && !frameFilePath) {
    await createFrameFile(frameFilePath);
  }
  while (true) {
    const action = await promptMainAction(frameFilePath);
    await handleMainAction(action, frameFilePath);
  }
}

async function promptMainAction(frameFilePath: string): Promise<string> {
  d && console.clear();
  await displayStatus(frameFilePath);
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

async function handleMainAction(action: string, path: string): Promise<void> {
  switch (action) {
    case "complete":
      await handleCompleteAction(path);
      break;
    case "add":
      await handleAddNestedAction(path);
      break;
    case "later":
      await handleAddLater(path);
      break;
    case "more":
      await handleMoreAction(path);
      break;
  }
}

async function handleCompleteAction(path: string): Promise<void> {
  await completeCurrentItemEffect(path);
  console.log("All Frames completed. Time for a break?");
}

async function handleAddNestedAction(path: string): Promise<void> {
  d && console.clear();
  await displayStatus(path);
  showHint(SYNTAX_HINT);
  const newItems = await Input.prompt({
    ...promptOptions,
    message: "Focus on:",
  });
  await createNestedChildrenEffect(newItems, path);
}

async function handleAddLater(path: string): Promise<void> {
  d && console.clear();
  await displayStatus(path);
  showHint(SYNTAX_HINT);
  const newItems = await Input.prompt({
    ...promptOptions,
    message: "Add for later:",
  });
  await addNextSiblingToCurrentItemEffect(newItems, path);
}

async function handleMoreAction(path: string): Promise<void> {
  d && console.clear();
  await displayStatus(path);
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
      await handleEditAction(path);
      break;
    case "switch":
      await handleSwitchAction(path);
      break;
    case "back":
      return; // Go back to the previous menu
    case "quit":
      console.log("Exiting...");
      Deno.exit();
      break;
  }
}

async function handleEditAction(path: string): Promise<void> {
  const currentItem = await getCurrentItemBreadcrumbEffect(path);
  let currentItemName = "";
  if (currentItem.split("\n").length > 1) {
    currentItemName = currentItem.split("\n")[1];
  } else {
    currentItemName = currentItem;
  }

  d && console.clear();
  await displayStatus(path);
  const newText = await Input.prompt({
    ...promptOptions,
    minLength: 1,
    default: currentItemName,
    message: "New name:",
  });
  await editCurrentItemNameEffect(newText, path);
}

async function handleSwitchAction(path: string): Promise<void> {
  d && console.clear();
  await displayStatus(path);
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
  console.log("Switching to " + switchToKey);
  await setCurrentItemEffect(switchToKey, path);
}

export { interactiveTUI };
