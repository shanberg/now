import { Confirm } from "https://deno.land/x/cliffy@v0.25.7/prompt/mod.ts";
import { colors } from "https://deno.land/x/cliffy@v0.25.7/ansi/colors.ts";
import { getCurrentFocus, getCurrentItemDetails, getTree } from "./frame.ts";
import { DATA_STR } from "./consts.ts";

export const FOCUS_ARROW = "▶︎";

export const SEPARATOR_STR = "---";

export const promptOptions = {
  prefix: "",
  pointer: "",
  search: true,
  searchLabel: "",
  maxRows: 20,
  listPointer: colors.bold("•"),
  indent: "",
};

const STYLE = {
  hint: colors.dim,
  menuItem: colors.bold,
  menuItemDisabled: colors.dim.strikethrough,
};

export const SYNTAX_HINT = STYLE.hint("Syntax: Item 1, Item 2 / Item 2.1");

export const styleOptions = (options: any[]) => {
  return options.map((option) => {
    if (!option.name) return option;
    if (option.disabled) {
      return {
        ...option,
        name: STYLE.menuItemDisabled(option.name),
      };
    } else {
      return {
        ...option,
        name: STYLE.menuItem(option.name),
      };
    }
  });
};

export const showHint = (text: string) => {
  console.log(STYLE.hint(text));
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
  const {
    breadcrumbStr,
    focusStr,
    isLeaf,
    depth,
    siblingCount,
    pathToRoot,
    descendantCount,
  } = getCurrentItemDetails(tree);

  const trimmedBread = breadcrumbStr.split(" / ").slice(1).join(" / ");
  console.log(colors.dim(trimmedBread || "—"));
  console.log(
    [colors.yellow(`${FOCUS_ARROW} ${focusStr}`), !isLeaf && colors.dim(" / …")]
      .filter(Boolean).join(""),
  );
  console.log();
}

export async function displayCurrentFocusEffect(path: string): Promise<void> {
  const tree = await getTree(path);
  displayCurrentFocus(tree);
}
