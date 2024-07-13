import {
  Input,
  Select,
} from "https://deno.land/x/cliffy@v0.25.7/prompt/mod.ts";
import {
  createNewNestedListItem,
  editCurrentItem,
  instantiateNewList,
  listItems,
  popCurrentItem,
  setCurrentItem,
  showCurrentItem,
} from "./frame.ts";

// Interactive CLI loop
async function interactiveCLI() {
  while (true) {
    await showCurrentItem();
    const action = await Select.prompt({
      message: "Choose an action",
      options: [
        { name: "Add frame", value: "add" },
        { name: "Complete current frame", value: "complete" },
        { name: "Edit current frame", value: "edit" },
        { name: "Switch current frame", value: "switch" },
        { name: "Exit", value: "exit" },
      ],
    });

    if (action === "add") {
      const newText = await Input.prompt("Enter the text for the new frame:");
      await createNewNestedListItem(newText);
    } else if (action === "complete") {
      await popCurrentItem();
    } else if (action === "edit") {
      const newText = await Input.prompt(
        "Enter the new text for the current frame:",
      );
      await editCurrentItem(newText);
    } else if (action === "switch") {
      const items = await listItems();
      const itemToSwitch = await Select.prompt({
        message: "Choose the frame to switch to",
        options: items.map((item, index) => ({
          name: item,
          value: index.toString(),
        })),
      });
      await setCurrentItem([parseInt(itemToSwitch)]);
    } else if (action === "exit") {
      console.log("Exiting...");
      break;
    }
  }
}

// Run the interactive CLI
await interactiveCLI();
