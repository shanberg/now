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
  console.log(`Executing command: ${command} with path: ${frameFilePath}`);
  switch (command) {
    case "status":
      console.log("Calling displayCurrentFocusEffect");
      await displayCurrentFocusEffect(frameFilePath);
      break;
    case "complete":
      console.log("Calling completeCurrentItemEffect");
      await completeCurrentItemEffect(frameFilePath);
      break;
    case "add":
      console.log("Calling createNestedChildrenEffect");
      await createNestedChildrenEffect(args[0], frameFilePath);
      break;
    case "later":
      console.log("Calling addNextSiblingToCurrentItemEffect");
      await addNextSiblingToCurrentItemEffect(args[0], frameFilePath);
      break;
    case "edit":
      console.log("Calling editCurrentItemNameEffect");
      await editCurrentItemNameEffect(args[0], frameFilePath);
      break;
    case "switch": {
      const items = await getItemsListEffect(frameFilePath);
      const index = args[0];
      if (index >= 0 && index < items.length) {
        console.log("Calling setCurrentItemEffect");
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
