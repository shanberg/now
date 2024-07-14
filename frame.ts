import { readJson } from "https://deno.land/x/jsonfile@1.0.0/mod.ts";

interface Config {
    filePath: string;
}

const ROOT_FRAME = "- Root Frame";
const MARKER = "@";

// Example file content
// - Frame @
//   - Item 1
//     - Item 1.1
//     - Item 1.2
//   - Item 2
//     - Item 2.1
//     - Item 2.2

async function getFilePath(): Promise<string> {
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

// Helper function to find the current item index
function findCurrentItemIndex(lines: string[]): number {
    return lines.findIndex((line) => line.trim().endsWith(MARKER));
}

// Helper function to find the deepest leaf node index
function findDeepestLeafNodeIndex(lines: string[]): number {
    let maxIndent = -1;
    let deepestIndex = -1;
    lines.forEach((line, index) => {
        const indentLevel = line.match(/^(\s*)-/)?.[1].length ?? 0;
        if (indentLevel > maxIndent) {
            maxIndent = indentLevel;
            deepestIndex = index;
        }
    });
    return deepestIndex;
}

// Helper function to find the parent index
function findParentIndex(lines: string[], currentIndex: number): number {
    const currentIndent = lines[currentIndex].match(/^(\s*)-/)?.[1].length ?? 0;
    for (let i = currentIndex - 1; i >= 0; i--) {
        const indentLevel = lines[i].match(/^(\s*)-/)?.[1].length ?? 0;
        if (indentLevel < currentIndent) {
            return i;
        }
    }
    return 0; // Default to root frame if no parent found
}

// Utility function to add or remove the current item marker
function updateCurrentItemMarker(
    lines: string[],
    index: number,
    add: boolean,
): void {
    if (add) {
        lines[index] += " " + MARKER;
    } else {
        lines[index] = lines[index].replace(" " + MARKER, "");
    }
}

// Exported function to get the current item index
export async function getCurrentItemIndex(): Promise<number> {
    const content = await readMarkdownFile();
    const lines = content.split("\n");
    return findCurrentItemIndex(lines);
}

// Instantiate a new list if it doesn't exist
export async function instantiateNewListIfNeeded(): Promise<void> {
    const content = await readMarkdownFile();
    if (content.trim() === "") {
        const initialContent = ROOT_FRAME + " " + MARKER;
        await writeMarkdownFile(initialContent);
        console.log("New list instantiated with root item.");
    }
}

// Create a new nested list item
export async function createNewNestedListItem(newText: string): Promise<void> {
    const content = await readMarkdownFile();
    const lines = content.split("\n");
    const currentIndex = findCurrentItemIndex(lines);
    const currentIndent = lines[currentIndex].match(/^(\s*)-/)?.[1].length ?? 0;
    const newIndent = currentIndent + 2;
    const newItem = `${" ".repeat(newIndent)}- ${newText} ${MARKER}`;

    // Insert the new item immediately after the current item
    lines.splice(currentIndex + 1, 0, newItem);

    // Remove the "@" from the previous current item
    if (currentIndex !== -1) {
        updateCurrentItemMarker(lines, currentIndex, false);
    }

    await writeMarkdownFile(lines.join("\n"));
    console.log("New nested list item created and marked as current.");
}

export async function completeCurrentItem(): Promise<
    { otherBranchesExist: boolean }
> {
    const content = await readMarkdownFile();
    const lines = content.split("\n");
    const currentIndex = findCurrentItemIndex(lines);

    // Ensure the root item cannot be completed
    if (currentIndex === 0) {
        console.log("Root item cannot be completed.");
        return { otherBranchesExist: false };
    }

    // Check if currentIndex is valid
    if (currentIndex < 0 || currentIndex >= lines.length) {
        console.error("Invalid currentIndex:", currentIndex);
        return { otherBranchesExist: false };
    }

    // Determine the indentation level of the current item
    const currentIndent = lines[currentIndex].match(/^(\s*)-/)?.[1].length ?? 0;

    // Find the range of lines to remove (current item and its children)
    let endIndex = currentIndex + 1;
    while (endIndex < lines.length) {
        const indentLevel = lines[endIndex].match(/^(\s*)-/)?.[1].length ?? 0;
        if (indentLevel <= currentIndent) {
            break;
        }
        endIndex++;
    }

    // Remove the current item and its children
    lines.splice(currentIndex, endIndex - currentIndex);

    // Check if there are other branches
    const otherBranchesExist = lines.length > 1;

    // Move the "@" marker to the next sibling, previous sibling, or parent item
    let newCurrentIndex = -1;

    // Try to move to the next sibling
    if (currentIndex < lines.length) {
        const nextIndent = lines[currentIndex].match(/^(\s*)-/)?.[1].length ??
            0;
        if (nextIndent === currentIndent) {
            newCurrentIndex = currentIndex;
        }
    }

    // If no next sibling, try to move to the previous sibling or parent
    if (newCurrentIndex === -1) {
        for (let i = currentIndex - 1; i >= 0; i--) {
            const prevIndent = lines[i].match(/^(\s*)-/)?.[1].length ?? 0;
            if (prevIndent <= currentIndent) {
                newCurrentIndex = i;
                break;
            }
        }
    }

    // Mark the new current item
    if (newCurrentIndex !== -1) {
        updateCurrentItemMarker(lines, newCurrentIndex, true);
    } else {
        // If there's no valid new current item, mark the root item as current
        if (lines.length > 0) {
            updateCurrentItemMarker(lines, 0, true);
        }
    }

    await writeMarkdownFile(lines.join("\n"));

    // Return whether other branches exist
    return { otherBranchesExist };
}

// Set a new leaf node as current
export async function setCurrentItem(index: number): Promise<void> {
    const content = await readMarkdownFile();
    const lines = content.split("\n");
    const currentIndex = findCurrentItemIndex(lines);
    if (currentIndex !== -1) {
        updateCurrentItemMarker(lines, currentIndex, false);
    }

    updateCurrentItemMarker(lines, index, true);
    await writeMarkdownFile(lines.join("\n"));
    console.log("Current item set to:", index);
}

// Edit the text of the current item
export async function editCurrentItem(newText: string): Promise<void> {
    const content = await readMarkdownFile();
    const lines = content.split("\n");
    const currentIndex = findCurrentItemIndex(lines);
    const indent = lines[currentIndex].match(/^(\s*)-/)?.[1] ?? "";
    lines[currentIndex] = `${indent}- ${newText} ${MARKER}`;
    await writeMarkdownFile(lines.join("\n"));
    console.log("Current item edited.");
}

// Show the current item with breadcrumb trail

export async function showCurrentItem(): Promise<void> {
    const content = await readMarkdownFile();
    const lines = content.split("\n");
    let currentIndex = findCurrentItemIndex(lines);
    if (currentIndex === -1) {
        currentIndex = findDeepestLeafNodeIndex(lines);
        if (currentIndex !== -1) {
            updateCurrentItemMarker(lines, currentIndex, true);
            await writeMarkdownFile(lines.join("\n"));
        }
    }
    if (currentIndex !== -1) {
        const currentIndent =
            lines[currentIndex].match(/^(\s*)-/)?.[1].length ?? 0;
        const currentItem = lines[currentIndex].trim().replace(" " + MARKER, "")
            .replace(/^- /, "");

        if (currentIndent > 0) {
            const breadcrumbTrail = [];
            let index = currentIndex;
            while (index !== 0) {
                const itemText = lines[index].trim().replace(" " + MARKER, "")
                    .replace(
                        /^- /,
                        "",
                    );
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

            console.log(`\x1b[2m\x1b[32m${breadcrumbString}\x1b[0m`);
        }

        console.log(`\x1b[1m\x1b[32mFocus: ${currentItem}\x1b[0m`);
    } else {
        console.log("No current item found.");
    }
}

// List all valid items
export async function listItems(): Promise<string[]> {
    const content = await readMarkdownFile();
    const lines = content.split("\n");

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
