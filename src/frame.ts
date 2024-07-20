// @deno-types="../types.d.ts"
import { readJson } from "https://deno.land/x/jsonfile@1.0.0/mod.ts";
import { INDENT, MARKER, ROOT_FRAME } from "./consts.ts";

// Example file content
// - Root Frame @
//   - Item 1
//     - Item 1.1
//     - Item 1.2
//   - Item 2
//     - Item 2.1
//     - Item 2.2

// Per change...
// 1. Read in config
// 2. Get file path
// 3. Read file
// 4. Make lines
// 5. Normalize and correct indentation in lines
// 5a. Announce any corrections made
// 6. Make requested line changes
// 7. Make file content
// 8. Write file

export async function getFilePath(): Promise<string> {
    const config = await readJson("./config.json") as Config;
    if (!config.filePath) {
        console.error("File path not found in config.json.");
        Deno.exit(1);
    }
    return config.filePath;
}

export const getItemFromLine = (line: Line): Item => {
    if (
        (!line.trim().startsWith("-") ||
            (line.trim() === ""))
    ) {
        throw new Error("Line does not start with a dash.");
    }
    if (
        (line.replace(" ", "") === "-") ||
        (line.replace(" ", "").replace("-", "").replace(MARKER, "") === "")
    ) {
        throw new Error("Line is empty.");
    }
    return line.trim().replace(" " + MARKER, "").replace("- ", "") as Item;
};

export const makeLineFromItem = (item: Item, indentLevel: number): Line => {
    if (typeof item !== "string") {
        throw new Error("Item must be a string");
    }
    if (typeof indentLevel !== "number" || indentLevel < 0) {
        throw new Error("Indent level must be a non-negative number");
    }

    const sanitizedItem = item.trim();
    const leadingWhitespace = INDENT.repeat(indentLevel);
    return `${leadingWhitespace}- ${sanitizedItem}` as Line;
};

export const makeLinesFromFileContent = (content: string): Line[] => {
    const lines = content.split("\n") as Line[];
    if (lines.length === 0) {
        console.warn("No lines found.");
    }
    return lines;
};

export const makeFileContentFromLines = (lines: Line[]): FileContent => {
    if (lines.length === 0) {
        console.warn("No lines provided.");
    }
    return lines.join("\n") as FileContent;
};

async function readMarkdownFile(): Promise<string> {
    const filePath = await getFilePath();
    try {
        return await Deno.readTextFile(filePath);
    } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
            console.log("File not found.");
            return "";
        } else {
            console.error("Error reading file:", error);
            return "";
        }
    }
}

async function writeMarkdownFile(content: string): Promise<void> {
    const filePath = await getFilePath();
    try {
        await Deno.writeTextFile(filePath, content);
    } catch (error) {
        console.error("Error writing file:", error);
    }
}

export const normalizeLineIndentation = (
    line: Line,
): Line => {
    const leadingWhitespace = line.match(/^(\s*)-/)?.[1].length ?? 0;
    const normalizedIndentLevel = Math.ceil(leadingWhitespace / INDENT.length);
    return setIndentLevel(line, normalizedIndentLevel);
};

export const checkIsRootFrame = (line: Line): boolean => {
    return line.trimStart().startsWith(ROOT_FRAME);
};

// Function to correct indentation
export function correctIndentation(lines: Line[]): Line[] {
    const normalizedLines: Line[] = [];
    let previousIndentLevel = getIndentLevel(
        normalizeLineIndentation(lines[0]),
    );

    lines.forEach((line, index) => {
        // Ignore empty lines
        if (line.trim() === "") {
            normalizedLines.push("" as Line);
            return;
        }

        // Make root frame zero indentation
        if (index === 0 && checkIsRootFrame(line)) {
            const freshRoot = "- Root Frame" as Line;
            normalizedLines.push(freshRoot);
            previousIndentLevel = 0;
            return;
        }

        // Otherwise, normalize
        const normalizedLine = normalizeLineIndentation(line);
        const normalizedIndentLevel = getIndentLevel(normalizedLine);

        if (normalizedIndentLevel > previousIndentLevel + 1) {
            // No item is allowed to be indented more than 1 level
            const adjustedIndentLevel = previousIndentLevel + 1;
            const adjustedLine = setIndentLevel(line, adjustedIndentLevel);
            normalizedLines.push(adjustedLine);
        } else {
            normalizedLines.push(normalizedLine);
        }

        previousIndentLevel = getIndentLevel(
            normalizedLines[normalizedLines.length - 1],
        );
    });

    return normalizedLines;
}

// Function to detect irregular indentation
export function detectIrregularIndentation(lines: Line[]): number[] {
    const irregularLines: number[] = [];
    let previousIndentLevel = 0;

    lines.forEach((line, index) => {
        const indentLevel = getIndentLevel(line);

        if (
            indentLevel % INDENT.length !== 0 ||
            indentLevel > previousIndentLevel + INDENT.length
        ) {
            irregularLines.push(index);
        }
        previousIndentLevel = indentLevel;
    });

    return irregularLines;
}

// Helper function to find the current item index
export function findCurrentItemIndex(lines: Line[]): number {
    return lines.findIndex((line) => line.trim().endsWith(MARKER));
}

// Helper function to find the first deepest leaf node index
export function findFirstDeepestLeafNodeIndex(lines: Line[]): number {
    let maxIndent = -1;
    let deepestIndex = -1;

    const correctedLines = correctIndentation(lines);

    for (let index = 0; index < correctedLines.length; index++) {
        const line = correctedLines[index];
        const indentLevel = getIndentLevel(line);

        if (indentLevel > maxIndent) {
            maxIndent = indentLevel;
            deepestIndex = index;
        }
    }

    return deepestIndex;
}

// Helper function to find the parent index
export function findParentIndex(lines: Line[], currentIndex: number): number {
    const currentIndent = getIndentLevel(lines[currentIndex]);
    for (let i = currentIndex - 1; i >= 0; i--) {
        const indentLevel = getIndentLevel(lines[i]);
        if (indentLevel < currentIndent) {
            return i;
        }
    }
    return 0; // Default to root frame if no parent found
}

export function getIndentLevel(line: Line): number {
    const leadingWhitespace = line.match(/^(\s*)-/)?.[1] ?? "";
    if (leadingWhitespace.length % INDENT.length !== 0) {
        throw new Error("Invalid indentation level");
    }
    return leadingWhitespace.length / INDENT.length;
}

export const setIndentLevel = (line: Line, indentLevel: number): Line => {
    const leadingWhitespace = INDENT.repeat(Math.max(0, indentLevel));
    return leadingWhitespace + line.trimStart() as Line;
};

// Function to instantiate a new list if it doesn't exist
export function instantiateNewListIfNeeded(lines: Line[]): Line[] {
    if (lines.join("\n").trim() === "") {
        return [ROOT_FRAME + " " + MARKER as Line];
    }
    return lines;
}

// Function to create a new nested list item
export function createNewNestedListItem(
    lines: Line[],
    newText: string,
): Line[] {
    const currentIndex = findCurrentItemIndex(lines);
    const currentIndent = getIndentLevel(lines[currentIndex]);
    const newIndent = currentIndent + 1;
    const newItem = makeLineFromItem(newText as Item, newIndent);

    // Insert the new item immediately after the current item
    let newLines = [
        ...lines.slice(0, currentIndex + 1),
        newItem,
        ...lines.slice(currentIndex + 1),
    ] as Line[];

    newLines = setCurrentItem(newLines, currentIndent + 1);

    return newLines;
}

// Function to complete the current item
export function completeCurrentItem(
    lines: Line[],
): { lines: Line[]; otherBranchesExist: boolean } {
    const currentIndex = findCurrentItemIndex(lines);

    // Ensure the root item cannot be completed
    if (currentIndex === 0) {
        console.log("Root item cannot be completed.");
        return { lines, otherBranchesExist: lines.length > 1 };
    }

    // Check if currentIndex is valid
    if (currentIndex < 0 || currentIndex >= lines.length) {
        console.error("Invalid currentIndex:", currentIndex);
        return { lines, otherBranchesExist: lines.length > 1 };
    }

    // Determine the indentation level of the current item
    const currentIndent = getIndentLevel(lines[currentIndex]);

    // Find the range of lines to remove (current item and its children)
    let endIndex = currentIndex + 1;
    while (endIndex < lines.length) {
        const indentLevel = getIndentLevel(lines[endIndex]);
        if (indentLevel <= currentIndent) {
            break;
        }
        endIndex++;
    }

    // Remove the current item and its children
    const newLines = [
        ...lines.slice(0, currentIndex),
        ...lines.slice(endIndex),
    ];

    // Check if there are other branches
    const otherBranchesExist = newLines.length > 1;

    // Move the "@" marker to the next sibling, previous sibling, or parent item
    let newCurrentIndex = -1;

    // Try to move to the next sibling
    if (currentIndex < newLines.length) {
        const nextIndent = getIndentLevel(newLines[currentIndex]);
        if (nextIndent === currentIndent) {
            newCurrentIndex = currentIndex;
        }
    }

    // If no next sibling, try to move to the previous sibling or parent
    if (newCurrentIndex === -1) {
        for (let i = currentIndex - 1; i >= 0; i--) {
            const prevIndent = getIndentLevel(newLines[i]);
            if (prevIndent <= currentIndent) {
                newCurrentIndex = i;
                break;
            }
        }
    }

    // Mark the new current item using setCurrentItem
    if (newCurrentIndex !== -1) {
        return {
            lines: setCurrentItem(newLines, newCurrentIndex),
            otherBranchesExist,
        };
    } else {
        // If there's no valid new current item, mark the root item as current
        if (newLines.length > 0) {
            return {
                lines: setCurrentItem(newLines, 0),
                otherBranchesExist,
            };
        }
    }

    return { lines: newLines, otherBranchesExist };
}

// Function to set a new leaf node as current and update the current item marker
export function setCurrentItem(lines: Line[], index: number): Line[] {
    if (index < 0 || index >= lines.length) {
        console.error("Index out of range:", index);
        return lines;
    }

    const currentIndex = findCurrentItemIndex(lines);
    const newLines = [...lines] as Line[];

    // Remove the marker from the current item if it exists
    if (currentIndex !== -1) {
        newLines[currentIndex] = newLines[currentIndex].replace(
            " " + MARKER,
            "",
        ) as Line;
    }

    // Add the marker to the new current item
    const updatedLine = newLines[index] + " " + MARKER as Line;
    newLines[index] = updatedLine;

    return newLines;
}

// Function to edit the text of the current item
export function editCurrentItem(
    lines: Line[],
    newText: string,
): Line[] {
    const currentIndex = findCurrentItemIndex(lines);
    if (currentIndex === -1) {
        throw new Error("No current item found.");
    }
    const indent = getIndentLevel(lines[currentIndex]);
    let newLines = [...lines];

    const updatedLine = makeLineFromItem(newText as Item, indent);
    newLines[currentIndex] = updatedLine;
    newLines = setCurrentItem(newLines, currentIndex);

    return newLines;
}

// // Function to show the current item with breadcrumb trail
// export function getCurrentItemDetails(lines: string[]): string {
//     const currentIndex = findCurrentItemIndex(lines);
//     if (currentIndex !== -1) {
//         const currentIndent = getIndentLevel(lines[currentIndex]);
//         const currentItem = lines[currentIndex].trim().replace(" " + MARKER, "")
//             .replace(/^- /, "");

//         const currentItemOutput = `\x1b[1m\x1b[32mFocus: ${currentItem}\x1b[0m`;

//         if (currentIndent > 1) {
//             const breadcrumbTrail = [];
//             let index = currentIndex;
//             while (index !== 0) {
//                 const itemText = lines[index].trim().replace(" " + MARKER, "")
//                     .replace(/^- /, "");
//                 breadcrumbTrail.unshift(itemText);
//                 index = findParentIndex(lines, index);
//             }

//             const rootItem = breadcrumbTrail.shift(); // Remove root item
//             const secondItem = breadcrumbTrail.shift(); // Get second item
//             const remainingCount = breadcrumbTrail.length;

//             let breadcrumbString = rootItem;
//             if (remainingCount > 0) {
//                 breadcrumbString += ` / ${remainingCount} / ${secondItem}`;
//             } else if (secondItem && secondItem !== currentItem) {
//                 breadcrumbString += ` / ${secondItem}`;
//             }

//             breadcrumbString += " / ";

//             const breadcrumbTrailOutput =
//                 `\x1b[2m\x1b[32m${breadcrumbString}\x1b[0m`;

//             return breadcrumbTrailOutput + "\n" + currentItemOutput;
//         }

//         return currentItemOutput;
//     } else {
//         return "No current item found.";
//     }
// }

// Function to get current item details including breadcrumb trail
export function getCurrentItemDetails(
    lines: Line[],
): { currentItem: Item; breadcrumbs: Item[] } {
    const currentIndex = findCurrentItemIndex(lines);
    if (currentIndex === -1) {
        throw new Error("No current item found.");
    } else {
        const currentIndent = getIndentLevel(lines[currentIndex]);
        const currentItem = getItemFromLine(lines[currentIndex]);
        const breadcrumbs: Item[] = [];
        if (currentIndent > 0) {
            let index = currentIndex;
            while (index !== 0) {
                index = findParentIndex(lines, index);
                breadcrumbs.unshift(getItemFromLine(lines[index]));
            }
        }

        return { currentItem, breadcrumbs };
    }
}

// Function to format breadcrumbs into a string
export function formatBreadcrumbs(breadcrumbs: Item[]): FormattedBreadcrumb {
    if (breadcrumbs.length === 0) return "" as FormattedBreadcrumb;

    const rootItem = breadcrumbs.shift() ?? ""; // Remove root item
    const secondItem = breadcrumbs.shift(); // Get second item
    const remainingCount = breadcrumbs.length;

    let breadcrumbString = rootItem;
    if (remainingCount > 0) {
        breadcrumbString += ` / ${remainingCount} / ${secondItem ?? ""}`;
    } else if (secondItem) {
        breadcrumbString += ` / ${secondItem}`;
    }

    breadcrumbString += " / ";
    return breadcrumbString as FormattedBreadcrumb;
}

// Function to colorize breadcrumbs
export function colorizeBreadcrumbs(
    breadcrumbs: FormattedBreadcrumb,
): ColorizedBreadcrumb {
    return `\x1b[2m\x1b[32m${breadcrumbs}\x1b[0m` as ColorizedBreadcrumb;
}

// Function to colorize focus item
export function colorizeFocus(item: Item): ColorizedFocus {
    return `\x1b[1m\x1b[32mFocus: ${item}\x1b[0m` as ColorizedFocus;
}

// Function to display current item details
export function displayCurrentItemDetails(lines: Line[]): string {
    try {
        const { currentItem, breadcrumbs } = getCurrentItemDetails(lines);
        const formattedBreadcrumbs = formatBreadcrumbs(breadcrumbs);
        const coloredBreadcrumbs = colorizeBreadcrumbs(formattedBreadcrumbs);
        const coloredFocus = colorizeFocus(currentItem);

        if (breadcrumbs.length === 0) return coloredFocus;
        return `${coloredBreadcrumbs}\n${coloredFocus}`;
    } catch (error) {
        return error.message;
    }
}

// Function to list all valid items
export function listItems(lines: Line[]): Line[] {
    // Find the index of the "Root Frame" line
    const rootIndex = lines.findIndex((line) =>
        line.trim().startsWith("- Root Frame")
    );

    if (rootIndex === -1) {
        console.log("Root Frame not found.");
        return [];
    }

    // Filter and return valid items
    return lines.slice(rootIndex + 1) // Start from the line after "Root Frame"
        .filter((line) => {
            const trimmedLine = line.trim();
            return trimmedLine.startsWith("- ") && trimmedLine.length > 2; // Ensure there's content after "- "
        });
}

// Exported function to get the current item index
export async function getCurrentItemIndexEffect(): Promise<number> {
    const content = await readMarkdownFile();
    const lines = content.split("\n") as Line[];
    return findCurrentItemIndex(lines);
}

// Exported function to instantiate a new list if needed
export async function instantiateNewListIfNeededEffect(): Promise<void> {
    const content = await readMarkdownFile();
    let lines = content.split("\n") as Line[];
    lines = instantiateNewListIfNeeded(lines);
    await writeMarkdownFile(lines.join("\n"));
    console.log("New list instantiated with root item.");
}

// Exported function to create a new nested list item
export async function createNewNestedListItemEffect(
    newText: string,
): Promise<void> {
    const content = await readMarkdownFile();
    let lines = content.split("\n") as Line[];
    lines = createNewNestedListItem(lines, newText);
    await writeMarkdownFile(lines.join("\n"));
    console.log("New nested list item created and marked as current.");
}

// Exported function to complete the current item
export async function completeCurrentItemEffect(): Promise<
    { otherBranchesExist: boolean }
> {
    const content = await readMarkdownFile();
    let lines = content.split("\n") as Line[];
    const result = completeCurrentItem(lines);
    lines = result.lines;
    await writeMarkdownFile(lines.join("\n"));
    return { otherBranchesExist: result.otherBranchesExist };
}

// Exported function to set a new leaf node as current
export async function setCurrentItemEffect(index: number): Promise<void> {
    const content = await readMarkdownFile();
    let lines = content.split("\n") as Line[];
    lines = setCurrentItem(lines, index);
    await writeMarkdownFile(lines.join("\n"));
    console.log("Current item set to:", index);
}

// Exported function to edit the text of the current item
export async function editCurrentItemEffect(newText: string): Promise<void> {
    const content = await readMarkdownFile();
    let lines = content.split("\n") as Line[];
    lines = editCurrentItem(lines, newText);
    await writeMarkdownFile(lines.join("\n"));
    console.log("Current item edited.");
}

// Exported function to show the current item with breadcrumb trail
export async function showCurrentItemEffect(): Promise<void> {
    const content = await readMarkdownFile();
    const lines = content.split("\n") as Line[];
    const details = getCurrentItemDetails(lines);
    console.log(details);
}

// Exported function to list all valid items
export async function listItemsEffect(): Promise<string[]> {
    const content = await readMarkdownFile();
    const lines = content.split("\n") as Line[];
    return listItems(lines);
}
