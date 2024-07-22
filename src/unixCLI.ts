import {
  createFrameFile,
  displayCurrentFocusEffect,
  findOrCreateFrameFile,
} from "./cliUtils.ts";
import {
  addNextSiblingToCurrentItemEffect,
  completeCurrentItemEffect,
  createNestedChildrenEffect,
  editCurrentItemNameEffect,
  getItemsListEffect,
  setCurrentItemEffect,
} from "./frame.ts";

async function unixCLI(command: string, path?: string, ...args: any[]) {
  const frameFilePath = path || await findOrCreateFrameFile();
  if (!path && !frameFilePath) {
    await createFrameFile(frameFilePath);
  }
  switch (command) {
    case "status":
      await displayCurrentFocusEffect(frameFilePath);
      break;
    case "complete":
      await completeCurrentItemEffect(frameFilePath);
      break;
    case "add":
      await createNestedChildrenEffect(args[0], frameFilePath);
      break;
    case "later":
      await addNextSiblingToCurrentItemEffect(args[0], frameFilePath);
      break;
    case "edit":
      await editCurrentItemNameEffect(args[0], frameFilePath);
      break;
    case "switch": {
      const items = await getItemsListEffect(frameFilePath);
      const index = args[0];
      if (index >= 0 && index < items.length) {
        await setCurrentItemEffect(index.toString(), frameFilePath);
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
