import {
  Confirm,
  Input,
  Select,
} from "https://deno.land/x/cliffy@v0.25.7/prompt/mod.ts";
import {
  addChildToCurrentItemEffect,
  completeCurrentItemEffect,
  editCurrentItemNameEffect,
  getCurrentItemBreadcrumbEffect,
  getItemsListEffect,
  setCurrentItemEffect,
} from "./frame.ts";

/**
 * Starts the interactive command-line interface (CLI) for managing frames.
 * Continuously prompts the user for actions and handles them accordingly.
 */
async function interactiveCLI() {
  const path = Deno.args[0] || await findOrCreateFrameFile();
  console.log(`Using frame file: ${path}`);
  while (true) {
    console.clear();
    console.log(await getCurrentItemBreadcrumbEffect(path));
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
    message: "Select an action",
    options: [
      { name: "Add Frame", value: "add" },
      { name: "Complete Frame", value: "complete" },
      { name: "More Options", value: "more" },
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
  const newText = await Input.prompt(
    "Enter the description for the new Frame:",
  );
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
  const moreAction = await Select.prompt({
    message: "Select an option",
    options: [
      { name: "Edit Frame", value: "edit" },
      { name: "Switch Frame", value: "switch" },
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
  const newText = await Input.prompt(
    "Enter the new description for the current Frame:",
  );
  await editCurrentItemNameEffect(newText, path);
}

/**
 * Handles the action to switch to a different frame.
 * @param {string} path - The path to the frame file.
 */
async function handleSwitchAction(path: string): Promise<void> {
  const items = await getItemsListEffect(path);
  const itemToSwitch = await Select.prompt({
    message: "Select a Frame to switch to:",
    options: items.map((item, index) => ({
      name: item,
      value: index.toString(),
    })),
  });
  await setCurrentItemEffect(itemToSwitch, path);
}

interactiveCLI();
