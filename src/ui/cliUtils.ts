import {
  Confirm,
  type SelectOption,
} from "https://deno.land/x/cliffy@v0.25.7/prompt/mod.ts";
import { colors } from "https://deno.land/x/cliffy@v0.25.7/ansi/colors.ts";
import { resolve } from "std/path/mod.ts";
import { getCurrentItemDetails, getTree } from "../operations/index.ts";
import { DATA_STR, INITIAL_FOCUS_CONTENT, NOW_FILE_SUFFIX } from "../consts.ts";
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

/** Maps options to styled names (primary, disabled, default). */
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

/** Logs a hint line using dim style. */
export const showHint = (text: string): void => {
  console.log(STYLE.hint(text));
};

/** Returns the first focus file (.*.now.md) in cwd, or null. Never prompts. */
export function findFocusFileInCwd(): string | null {
  const files = [...Deno.readDirSync(".")].filter(
    (file) => file.isFile && file.name.endsWith(NOW_FILE_SUFFIX),
  );
  return files.length > 0 ? files[0].name : null;
}

/** Finds an existing focus file in cwd or prompts to create one; returns its filename. */
export async function findOrCreateFocusFile(): Promise<string> {
  const found = findFocusFileInCwd();
  if (found) return found;
  const folderName = Deno.cwd().split("/").pop();
  const fileName = `.${folderName}.${NOW_FILE_SUFFIX}`;
  return await createFocusFile(fileName);
}

/** Resolves the focus file path: NOW_FILE env, or file in cwd, or (if interactive) prompt. Always returns absolute path. */
export async function resolveFocusFilePath(
  options: { interactive?: boolean } = {},
): Promise<string> {
  const { interactive = true } = options;
  const fromEnv = Deno.env.get("NOW_FILE");
  if (fromEnv) return resolve(Deno.cwd(), fromEnv);
  const inCwd = findFocusFileInCwd();
  if (inCwd) return resolve(Deno.cwd(), inCwd);
  if (interactive) {
    const path = await findOrCreateFocusFile();
    return resolve(Deno.cwd(), path);
  }
  throw new Error(
    "No focus file found and NOW_FILE not set. Set NOW_FILE to your focus file path (e.g. export NOW_FILE=$HOME/.now/focus.now.md) or run from a directory with a .now.md file. To create a file: NOW_FILE=/path/to/file.now.md now init",
  );
}

/** Prompts to create a focus file; writes initial content and returns filename, or exits if declined. */
export async function createFocusFile(fileName: string): Promise<string> {
  showHint("Files are stored in the current directory.");
  const createFile = await Confirm.prompt({
    ...promptOptions,
    message: `No focus file found. Create ${fileName}?`,
  });

  if (createFile) {
    await Deno.writeTextFile(fileName, INITIAL_FOCUS_CONTENT);
    return fileName;
  } else {
    console.log("No focus file created. Exiting...");
    Deno.exit();
  }
}

/** Prints the current focus breadcrumb and focus line to the console. */
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

/** Loads the tree from path and displays the current focus. */
export async function displayCurrentFocusEffect(path: string): Promise<void> {
  const tree = await getTree(path);
  displayCurrentFocus(tree);
}
