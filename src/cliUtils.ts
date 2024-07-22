import { Confirm } from "https://deno.land/x/cliffy@v0.25.7/prompt/mod.ts";
import { colors } from "https://deno.land/x/cliffy@v0.25.7/ansi/colors.ts";
import { getCurrentItemBreadcrumbEffect } from "./frame.ts";

export const FOCUS_ARROW = "▶︎";

export const promptOptions = {
  prefix: "",
  pointer: "",
  listPointer: colors.bold("•"),
  indent: "",
};

export const SYNTAX_HINT = colors.dim("Syntax: Item 1, Item 2 / Item 2.1");

export const showHint = (text: string) => {
  console.log(colors.dim(text));
};

export async function findOrCreateFrameFile(): Promise<string> {
  const folderName = Deno.cwd().split("/").pop();
  const fileName = `.${folderName}.frame.md`;
  const files = [...Deno.readDirSync(".")].filter((file) =>
    file.isFile && file.name.endsWith(".frame.md")
  );
  if (files.length > 0) {
    return files[0].name;
  } else {
    return fileName;
  }
}

export async function createFrameFile(fileName: string): Promise<string> {
  showHint("Files are stored in the current directory.");
  const createFile = await Confirm.prompt({
    ...promptOptions,
    message: `No frame file found. Create ${fileName}?`,
  });

  if (createFile) {
    await Deno.writeTextFile(
      fileName,
      `#${DATA_STR.lineMarker}Root Frame ${DATA_STR.currentItemMarker}\n`,
    );
    return fileName;
  } else {
    console.log("No frame file created. Exiting...");
    Deno.exit();
  }
}

export async function displayStatus(path: string): Promise<void> {
  const currentItem = await getCurrentItemBreadcrumbEffect(path);

  if (currentItem.split("\n").length > 1) {
    const breadcrumbStr = currentItem.split("\n")[0];
    const focusStr = currentItem.split("\n")[1];
    console.log(colors.dim(breadcrumbStr + " /"));
    console.log(colors.yellow(`${FOCUS_ARROW} ${focusStr}`));
  } else {
    console.log(colors.dim("Focusing on"));
    console.log(colors.yellow(`${FOCUS_ARROW} ${currentItem}`));
  }
  console.log();
}
