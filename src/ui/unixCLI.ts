import {
  createFocusFile,
  displayCurrentFocusEffect,
  findOrCreateFocusFile,
} from "./cliUtils.ts";
import {
  addNextSiblingToCurrentItemEffect,
  completeCurrentItemEffect,
  createNestedChildrenEffect,
  editCurrentItemNameEffect,
  getItemsListEffect,
  setCurrentItemEffect,
} from "../operations/index.ts";

async function unixCLI(command: string, ...args: string[]) {
  const focusFilePath = await findOrCreateFocusFile();
  if (!focusFilePath) {
    await createFocusFile(focusFilePath);
  }
  console.log(`Executing command: ${command} with path: ${focusFilePath}`);
  switch (command) {
    case "status":
      console.log("Calling displayCurrentFocusEffect");
      await displayCurrentFocusEffect(focusFilePath);
      break;
    case "complete":
      console.log("Calling completeCurrentItemEffect");
      await completeCurrentItemEffect(focusFilePath);
      break;
    case "add":
      console.log("Calling createNestedChildrenEffect");
      await createNestedChildrenEffect(args[0], focusFilePath);
      break;
    case "later":
      console.log("Calling addNextSiblingToCurrentItemEffect");
      await addNextSiblingToCurrentItemEffect(args[0], focusFilePath);
      break;
    case "edit":
      console.log("Calling editCurrentItemNameEffect");
      await editCurrentItemNameEffect(args[0], focusFilePath);
      break;
    case "switch": {
      const items = await getItemsListEffect(focusFilePath);
      const index = parseInt(args[0], 10);
      if (index >= 0 && index < items.length) {
        console.log("Calling setCurrentItemEffect");
        await setCurrentItemEffect(index.toString(), focusFilePath);
      } else {
        console.log("Invalid index");
      }
      break;
    }
    default:
      console.log("Unknown command");
  }
}

export { unixCLI };
