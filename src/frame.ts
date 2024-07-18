import { readJson } from "https://deno.land/x/jsonfile@1.0.0/mod.ts";
import { INDENT, MARKER, ROOT_FRAME } from "./consts.ts";

interface Config {
    filePath: string;
}

// Example file content
// - Root Frame @
//   - Item 1
//     - Item 1.1
//     - Item 1.2
//   - Item 2
//     - Item 2.1
//     - Item 2.2

export async function getFilePath(): Promise<string> {
    const config = await readJson("./config.json") as Config;
    return config.filePath;
}

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

// Function to normalize indentation
export function normalizeIndentation(lines: string[]): string[] {
    const normalizedLines: string[] = [];
    let previousIndentLevel = 0;

    lines.forEach((line) => {
        const indentLevel = getIndentLevel(line);
        const correctedIndentLevel = Math.floor(indentLevel / INDENT.length) *
            INDENT.length;

        if (
            indentLevel % INDENT.length !== 0 ||
            indentLevel > previousIndentLevel + INDENT.length
        ) {
            // Adjust the indentation to be a multiple of INDENT length and not more than one level deeper than the previous line
            const correctedLine =
                INDENT.repeat(correctedIndentLevel / INDENT.length) +
                line.trim();
            normalizedLines.push(correctedLine);
        } else {
            normalizedLines.push(line);
        }
        previousIndentLevel = correctedIndentLevel;
    });

    return normalizedLines;
}

// Function to detect irregular indentation
export function detectIrregularIndentation(lines: string[]): number[] {
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
export function findCurrentItemIndex(lines: string[]): number {
    return lines.findIndex((line) => line.trim().endsWith(MARKER));
}

// Helper function to find the first deepest leaf node index
export function findFirstDeepestLeafNodeIndex(lines: string[]): number {
    let maxIndent = -1;
    let deepestIndex = -1;

    for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        const indentLevel = getIndentLevel(line);

        if (indentLevel > maxIndent) {
            maxIndent = indentLevel;
            deepestIndex = index;
        }
    }

    return deepestIndex;
}

// Helper function to find the parent index
export function findParentIndex(lines: string[], currentIndex: number): number {
    const currentIndent = getIndentLevel(lines[currentIndex]);
    for (let i = currentIndex - 1; i >= 0; i--) {
        const indentLevel = getIndentLevel(lines[i]);
        if (indentLevel < currentIndent) {
            return i;
        }
    }
    return 0; // Default to root frame if no parent found
}

export function getIndentLevel(line: string): number {
    const leadingWhitespace = line.match(/^(\s*)-/)?.[1].length ?? 0;
    return Math.floor(leadingWhitespace / INDENT.length);
}

const setIndentLevel = (line: string, indentLevel: number): string => {
    const leadingWhitespace = INDENT.repeat(indentLevel);
    return leadingWhitespace + line.trim();
};

// Function to instantiate a new list if it doesn't exist
export function instantiateNewListIfNeeded(lines: string[]): string[] {
    if (lines.join("\n").trim() === "") {
        return [ROOT_FRAME + " " + MARKER];
    }
    return lines;
}

// Function to create a new nested list item
export function createNewNestedListItem(
    lines: string[],
    newText: string,
): string[] {
    const currentIndex = findCurrentItemIndex(lines);
    const currentIndent = getIndentLevel(lines[currentIndex]);
    const newIndent = currentIndent + 1; // Increase indentation by one level
    const newItem = `${INDENT.repeat(newIndent)}- ${newText} ${MARKER}`;

    // Insert the new item immediately after the current item
    const newLines = [
        ...lines.slice(0, currentIndex + 1),
        newItem,
        ...lines.slice(currentIndex + 1),
    ];

    // Remove the "@" from the previous current item
    if (currentIndex !== -1) {
        newLines[currentIndex] = newLines[currentIndex].replace(
            ` ${MARKER}`,
            "",
        );
    }

    return newLines;
}

// Function to complete the current item
export function completeCurrentItem(
    lines: string[],
): { lines: string[]; otherBranchesExist: boolean } {
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
export function setCurrentItem(lines: string[], index: number): string[] {
    if (index < 0 || index >= lines.length) {
        console.error("Index out of range:", index);
        return lines;
    }

    const currentIndex = findCurrentItemIndex(lines);
    const newLines = [...lines];

    // Remove the marker from the current item if it exists
    if (currentIndex !== -1) {
        newLines[currentIndex] = newLines[currentIndex].replace(
            " " + MARKER,
            "",
        );
    }

    // Add the marker to the new current item
    newLines[index] += " " + MARKER;

    return newLines;
}

// Function to edit the text of the current item
export function editCurrentItem(
    lines: string[],
    newText: string,
): string[] {
    const currentIndex = findCurrentItemIndex(lines);
    if (currentIndex === -1) {
        throw new Error("No current item found.");
    }
    const indent = getIndentLevel(lines[currentIndex]);
    const newLines = [...lines];
    newLines[currentIndex] = setIndentLevel(`- ${newText} ${MARKER}`, indent);
    return newLines;
}

// Function to show the current item with breadcrumb trail
export function getCurrentItemDetails(lines: string[]): string {
    const currentIndex = findCurrentItemIndex(lines);
    if (currentIndex !== -1) {
        const currentIndent = getIndentLevel(lines[currentIndex]);
        const currentItem = lines[currentIndex].trim().replace(" " + MARKER, "")
            .replace(/^- /, "");

        const currentItemOutput = `\x1b[1m\x1b[32mFocus: ${currentItem}\x1b[0m`;

        if (currentIndent > 1) {
            const breadcrumbTrail = [];
            let index = currentIndex;
            while (index !== 0) {
                const itemText = lines[index].trim().replace(" " + MARKER, "")
                    .replace(/^- /, "");
                breadcrumbTrail.unshift(itemText);
                index = findParentIndex(lines, index);
            }

            const rootItem = breadcrumbTrail.shift(); // Remove root item
            const secondItem = breadcrumbTrail.shift(); // Get second item
            const remainingCount = breadcrumbTrail.length;

            let breadcrumbString = rootItem;
            if (remainingCount > 0) {
                breadcrumbString += ` / ${remainingCount} / ${secondItem}`;
            } else if (secondItem && secondItem !== currentItem) {
                breadcrumbString += ` / ${secondItem}`;
            }

            breadcrumbString += " / ";

            const breadcrumbTrailOutput =
                `\x1b[2m\x1b[32m${breadcrumbString}\x1b[0m`;

            return breadcrumbTrailOutput + "\n" + currentItemOutput;
        }

        return currentItemOutput;
    } else {
        return "No current item found.";
    }
}

// Function to list all valid items
export function listItems(lines: string[]): string[] {
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
    const lines = content.split("\n");
    return findCurrentItemIndex(lines);
}

// Exported function to instantiate a new list if needed
export async function instantiateNewListIfNeededEffect(): Promise<void> {
    let content = await readMarkdownFile();
    let lines = content.split("\n");
    lines = instantiateNewListIfNeeded(lines);
    await writeMarkdownFile(lines.join("\n"));
    console.log("New list instantiated with root item.");
}

// Exported function to create a new nested list item
export async function createNewNestedListItemEffect(
    newText: string,
): Promise<void> {
    let content = await readMarkdownFile();
    let lines = content.split("\n");
    lines = createNewNestedListItem(lines, newText);
    await writeMarkdownFile(lines.join("\n"));
    console.log("New nested list item created and marked as current.");
}

// Exported function to complete the current item
export async function completeCurrentItemEffect(): Promise<
    { otherBranchesExist: boolean }
> {
    let content = await readMarkdownFile();
    let lines = content.split("\n");
    const result = completeCurrentItem(lines);
    lines = result.lines;
    await writeMarkdownFile(lines.join("\n"));
    return { otherBranchesExist: result.otherBranchesExist };
}

// Exported function to set a new leaf node as current
export async function setCurrentItemEffect(index: number): Promise<void> {
    let content = await readMarkdownFile();
    let lines = content.split("\n");
    lines = setCurrentItem(lines, index);
    await writeMarkdownFile(lines.join("\n"));
    console.log("Current item set to:", index);
}

// Exported function to edit the text of the current item
export async function editCurrentItemEffect(newText: string): Promise<void> {
    let content = await readMarkdownFile();
    let lines = content.split("\n");
    lines = editCurrentItem(lines, newText);
    await writeMarkdownFile(lines.join("\n"));
    console.log("Current item edited.");
}

// Exported function to show the current item with breadcrumb trail
export async function showCurrentItemEffect(): Promise<void> {
    const content = await readMarkdownFile();
    const lines = content.split("\n");
    const details = getCurrentItemDetails(lines);
    console.log(details);
}

// Exported function to list all valid items
export async function listItemsEffect(): Promise<string[]> {
    const content = await readMarkdownFile();
    const lines = content.split("\n");
    return listItems(lines);
}
