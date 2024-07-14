import {
  Input,
  Select,
} from "https://deno.land/x/cliffy@v0.25.7/prompt/mod.ts";
import {
  completeCurrentItem,
  createNewNestedListItem,
  editCurrentItem,
  getCurrentItemIndex,
  instantiateNewListIfNeeded,
  listItems,
  setCurrentItem,
  showCurrentItem,
} from "./frame.ts";

// Helper function to clear the screen
function clearScreen() {
  console.clear();
}

async function interactiveCLI() {
  await instantiateNewListIfNeeded();

  while (true) {
    clearScreen();
    await showCurrentItem();
    const action = await promptMainAction();
    await handleMainAction(action);
  }
}

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

async function handleMainAction(action: string): Promise<void> {
  switch (action) {
    case "add":
      await handleAddAction();
      break;
    case "complete":
      await handleCompleteAction();
      break;
    case "more":
      await handleMoreAction();
      break;
  }
}

async function handleAddAction(): Promise<void> {
  const newText = await Input.prompt(
    "Enter the description for the new Frame:",
  );
  await createNewNestedListItem(newText);
}

async function handleCompleteAction(): Promise<void> {
  const { otherBranchesExist } = await completeCurrentItem();
  const currentIndex = await getCurrentItemIndex();
  if (currentIndex === 0) {
    if (otherBranchesExist) {
      await switchToAnotherBranch();
    } else {
      console.log("All Frames completed. Time for a break?");
    }
  }
}

async function switchToAnotherBranch(): Promise<void> {
  const items = await listItems();
  const itemToSwitch = await Select.prompt({
    message: "Select another frame:",
    options: items.slice(1).map((item, index) => ({
      name: item,
      value: (index + 1).toString(),
    })),
  });
  await setCurrentItem(parseInt(itemToSwitch));
}

async function handleMoreAction(): Promise<void> {
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
      await handleEditAction();
      break;
    case "switch":
      await handleSwitchAction();
      break;
    case "exit":
      console.log("Exiting...");
      Deno.exit();
      break;
  }
}

async function handleEditAction(): Promise<void> {
  const newText = await Input.prompt(
    "Enter the new description for the current Frame:",
  );
  await editCurrentItem(newText);
}

async function handleSwitchAction(): Promise<void> {
  const items = await listItems();
  const itemToSwitch = await Select.prompt({
    message: "Select a Frame to switch to:",
    options: items.map((item, index) => ({
      name: item,
      value: index.toString(),
    })),
  });
  await setCurrentItem(parseInt(itemToSwitch));
}

interactiveCLI();
