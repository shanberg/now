import {
  Confirm,
  type SelectOption,
} from "https://deno.land/x/cliffy@v0.25.7/prompt/mod.ts";
import { colors } from "https://deno.land/x/cliffy@v0.25.7/ansi/colors.ts";
import { getCurrentItemDetails, getTree } from "../operations/index.ts";
import { DATA_STR, NOW_FILE_SUFFIX } from "../consts.ts";
import { type SelectOptionWithPrimary, type TreeNode } from "../../types.d.ts";

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

const STYLE = {
  focus: colors.yellow,
  breadcrumb: colors.dim.yellow,
  hint: colors.dim,
  menuItem: colors.bold.gray,
  menuItemDisabled: colors.dim.strikethrough,
  menuItemPrimary: colors.bold.white,
};

export const SYNTAX_HINT = STYLE.hint("Syntax: Item 1, Item 2 / Item 2.1");

export const styleOptions = (
  options: SelectOptionWithPrimary[],
): SelectOption[] => {
  return options.map((option) => {
    if (!option.name) return option;
    if (option.disabled) {
      return {
        ...option,
        name: STYLE.menuItemDisabled(option.name),
      };
    }
    if (option.primary) {
      return {
        ...option,
        name: STYLE.menuItemPrimary(option.name),
      };
    } else {
      return {
        ...option,
        name: STYLE.menuItem(option.name),
      };
    }
  });
};

export const showHint = (text: string): void => {
  console.log(STYLE.hint(text));
};

export async function findOrCreateFocusFile(): Promise<string> {
  const folderName = Deno.cwd().split("/").pop();
  const fileName = `.${folderName}.${NOW_FILE_SUFFIX}`;
  const files = [...Deno.readDirSync(".")].filter(
    (file) => file.isFile && file.name.endsWith(NOW_FILE_SUFFIX),
  );
  if (files.length > 0) {
    return files[0].name;
  } else {
    return await createFocusFile(fileName);
  }
}

export async function createFocusFile(fileName: string): Promise<string> {
  showHint("Files are stored in the current directory.");
  const createFile = await Confirm.prompt({
    ...promptOptions,
    message: `No focus file found. Create ${fileName}?`,
  });

  if (createFile) {
    await Deno.writeTextFile(
      fileName,
      `#${DATA_STR.lineMarker}${DATA_STR.rootFocus} ${DATA_STR.currentItemMarker}\n`,
    );
    return fileName;
  } else {
    console.log("No focus file created. Exiting...");
    Deno.exit();
  }
}

export function displayCurrentFocus(tree: TreeNode): void {
  const { breadcrumbStr, focusStr, isLeaf } = getCurrentItemDetails(tree);

  const trimmedBread = breadcrumbStr.split(" / ").slice(1).join(" / ");
  console.log(STYLE.breadcrumb(trimmedBread || "—"));
  console.log(
    [STYLE.focus(`${FOCUS_ARROW} ${focusStr}`), !isLeaf && colors.dim(" / …")]
      .filter(Boolean)
      .join(""),
  );
  console.log();
}

export async function displayCurrentFocusEffect(path: string): Promise<void> {
  const tree = await getTree(path);
  displayCurrentFocus(tree);
}
