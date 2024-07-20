import {
  Confirm,
  Input,
  Select,
} from "https://deno.land/x/cliffy@v0.25.7/prompt/mod.ts";
import { colors } from "https://deno.land/x/cliffy@v0.25.7/ansi/colors.ts";
import {
  addChildToCurrentItemEffect,
  completeCurrentItemEffect,
  editCurrentItemNameEffect,
  getCurrentItemBreadcrumbEffect,
  getItemsListEffect,
  setCurrentItemEffect,
} from "./frame.ts";

const FOCUS_ARROW = "▶︎";

const promptOptions = {
  prefix: "",
  pointer: colors.bold("•"),
  listPointer: colors.bold("•"),
  indent: "",
};

/**
 * Displays the current status including the breadcrumb and focus.
 * @param {string} path - The path to the frame file.
 */
async function displayStatus(path: string): Promise<void> {
  console.clear();
  const currentItem = await getCurrentItemBreadcrumbEffect(path);

  if (currentItem.split("\n").length > 1) {
    const breadcrumbStr = currentItem.split("\n")[0];
    const focusStr = currentItem.split("\n")[1].replace("Focus: ", "");
    console.log(colors.dim(breadcrumbStr));
    console.log(`${FOCUS_ARROW} ${focusStr}`);
  } else {
    console.log(`${FOCUS_ARROW} ${currentItem}`);
  }

  // console.log(colors.dim("—".repeat(24)));
  console.log();
}

/**
 * Starts the interactive command-line interface (CLI) for managing frames.
 * Continuously prompts the user for actions and handles them accordingly.
 */
async function interactiveCLI() {
  const path = Deno.args[0] || await findOrCreateFrameFile();
  console.log(`Using frame file: ${path}`);
  while (true) {
    await displayStatus(path);
    const action = await promptMainAction();
    await handleMainAction(action, path);
  }
}

/**
 * Finds an existing .frame.md file in the current directory or prompts the user to create one.
 * @returns {Promise<string>} The path to the frame file.
 */
async function findOrCreateFrameFile(): Promise<string> {
  const files = [...Deno.readDirSync(".")].filter((file) =>
    file.isFile && file.name.endsWith(".frame.md")
  );
  if (files.length > 0) {
    return files[0].name;
  } else {
    const createFile = await Confirm.prompt(
      "No .frame.md file found. Create one?",
    );
    if (createFile) {
      const folderName = Deno.cwd().split("/").pop();
      const fileName = `.${folderName}.frame.md`;
      await Deno.writeTextFile(fileName, "- Root Frame @\n");
      return fileName;
    } else {
      console.log("No frame file created. Exiting...");
      Deno.exit();
    }
  }
}

/**
 * Prompts the user to select a main action.
 * @returns {Promise<string>} The selected action.
 */
async function promptMainAction(): Promise<string> {
  return await Select.prompt({
    ...promptOptions,
    message: "Actions",
    options: [
      { name: "Complete current frame", value: "complete" },
      { name: "Add frame", value: "add" },
      { name: "More options", value: "more" },
    ],
  });
}

/**
 * Handles the main action selected by the user.
 * @param {string} action - The selected action.
 * @param {string} path - The path to the frame file.
 */
async function handleMainAction(action: string, path: string): Promise<void> {
  switch (action) {
    case "add":
      await handleAddAction(path);
      break;
    case "complete":
      await handleCompleteAction(path);
      break;
    case "more":
      await handleMoreAction(path);
      break;
  }
}

/**
 * Handles the action to add a new frame.
 * @param {string} path - The path to the frame file.
 */
async function handleAddAction(path: string): Promise<void> {
  await displayStatus(path);
  const newText = await Input.prompt({
    ...promptOptions,
    message: "Enter the description for the new Frame:",
  });
  await addChildToCurrentItemEffect(newText, path);
}

/**
 * Handles the action to complete the current frame.
 * @param {string} path - The path to the frame file.
 */
async function handleCompleteAction(path: string): Promise<void> {
  await completeCurrentItemEffect(path);
  console.log("All Frames completed. Time for a break?");
}

/**
 * Handles the action to display more options.
 * @param {string} path - The path to the frame file.
 */
async function handleMoreAction(path: string): Promise<void> {
  await displayStatus(path);
  const moreAction = await Select.prompt({
    ...promptOptions,
    message: "More Options",
    options: [
      { name: "Edit frame", value: "edit" },
      { name: "Switch frame", value: "switch" },
      { name: "Go back", value: "back" },
      { name: "Exit", value: "exit" },
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
    case "exit":
      console.log("Exiting...");
      Deno.exit();
      break;
  }
}

/**
 * Handles the action to edit the current frame's description.
 * @param {string} path - The path to the frame file.
 */
async function handleEditAction(path: string): Promise<void> {
  // Get the name of the current item
  const currentItem = await getCurrentItemBreadcrumbEffect(path);
  let currentItemName = "";
  if (currentItem.split("\n").length > 1) {
    currentItemName = currentItem.split("\n")[1].replace("Focus: ", "");
  } else {
    currentItemName = currentItem.replace("Focus: ", "");
  }

  // Prompt the user for the new name
  const newText = await Input.prompt({
    ...promptOptions,
    minLength: 1,
    default: currentItemName,
    message: "New description:",
  });
  await editCurrentItemNameEffect(newText, path);
}

/**
 * Handles the action to switch to a different frame.
 * @param {string} path - The path to the frame file.
 */
async function handleSwitchAction(path: string): Promise<void> {
  const items = await getItemsListEffect(path);
  await displayStatus(path);
  const itemToSwitch = await Select.prompt({
    ...promptOptions,
    search: true,
    message: "Select a Frame to switch to:",
    options: [
      ...items.map((item, index) => ({
        name: item,
        value: index.toString(),
      })),
      Select.separator(),
      { name: "Go Back", value: "back" },
    ],
  });
  await setCurrentItemEffect(itemToSwitch, path);
}

interactiveCLI();
