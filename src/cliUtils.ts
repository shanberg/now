import { Confirm } from "https://deno.land/x/cliffy@v0.25.7/prompt/mod.ts";
import { colors } from "https://deno.land/x/cliffy@v0.25.7/ansi/colors.ts";
import { getCurrentFocus, getTree } from "./frame.ts";
import { DATA_STR } from "./consts.ts";

export const FOCUS_ARROW = "▶︎";

export const promptOptions = {
  prefix: "",
  pointer: "",
  search: true,
  searchLabel: "",
  maxRows: 20,
  listPointer: colors.bold("•"),
  indent: "",
};

export const SYNTAX_HINT = colors.dim("Syntax: Item 1, Item 2 / Item 2.1");

export const showHint = (text: string) => {
  console.log(colors.dim(text));
};

export function findOrCreateFrameFile(): string {
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

export function displayCurrentFocus(tree: TreeNode): void {
  const { breadcrumbStr, focusStr } = getCurrentFocus(tree);
  const trimmedBread = breadcrumbStr.split(" / ").slice(1).join(" / ");

  console.log(colors.dim(trimmedBread || "—"));
  console.log(colors.yellow(`${FOCUS_ARROW} ${focusStr}`));
  console.log();
}

export async function displayCurrentFocusEffect(path: string): Promise<void> {
  const tree = await getTree(path);
  displayCurrentFocus(tree);
}
