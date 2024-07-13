const filePath = "./frame.md";
let currentItemIndex: number[] = [];

// Helper function to read the Markdown file
export async function readMarkdownFile(): Promise<string> {
    try {
        return await Deno.readTextFile(filePath);
    } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
            console.log("File not found. Creating a new file.");
            await instantiateNewList();
            return await Deno.readTextFile(filePath);
        } else {
            console.error("Error reading file:", error);
            return "";
        }
    }
}

// Helper function to write to the Markdown file
export async function writeMarkdownFile(content: string): Promise<void> {
    try {
        await Deno.writeTextFile(filePath, content);
    } catch (error) {
        console.error("Error writing file:", error);
    }
}

// Helper function to find the current item index
function findCurrentItemIndex(lines: string[]): number {
    return lines.findIndex((line) => line.trim().endsWith("@"));
}

// Instantiate a new list
export async function instantiateNewList(): Promise<void> {
    const initialContent = "- List item 1 @\n";
    await writeMarkdownFile(initialContent);
    currentItemIndex = [0];
    console.log("New list instantiated.");
}

// Create a new nested list item
export async function createNewNestedListItem(newText: string): Promise<void> {
    const content = await readMarkdownFile();
    const lines = content.split("\n");
    const currentIndex = findCurrentItemIndex(lines);
    const indent = "  ".repeat(currentItemIndex.length + 1);
    const newItem = `${indent}- ${newText} @\n`;
    lines.splice(currentIndex + 1, 0, newItem);

    // Remove the "@" from the previous current item
    if (currentIndex !== -1) {
        lines[currentIndex] = lines[currentIndex].replace(" @", "");
    }

    // Update the current item index
    currentItemIndex.push(currentIndex + 1);
    await writeMarkdownFile(lines.join("\n"));
    console.log("New nested list item created and marked as current.");
}

// Pop the current item
export async function popCurrentItem(): Promise<void> {
    const content = await readMarkdownFile();
    const lines = content.split("\n");
    const currentIndex = currentItemIndex[currentItemIndex.length - 1];
    lines.splice(currentIndex, 1);
    await writeMarkdownFile(lines.join("\n"));
    currentItemIndex.pop();
    console.log("Current item popped.");
}

// Set a new leaf node as current
export async function setCurrentItem(index: number[]): Promise<void> {
    const content = await readMarkdownFile();
    const lines = content.split("\n");
    const currentIndex = findCurrentItemIndex(lines);
    if (currentIndex !== -1) {
        lines[currentIndex] = lines[currentIndex].replace(" @", "");
    }
    currentItemIndex = index;
    lines[currentItemIndex[currentItemIndex.length - 1]] += " @";
    await writeMarkdownFile(lines.join("\n"));
    console.log("Current item set to:", index);
}

// Edit the text of the current item
export async function editCurrentItem(newText: string): Promise<void> {
    const content = await readMarkdownFile();
    const lines = content.split("\n");
    const currentIndex = currentItemIndex[currentItemIndex.length - 1];
    const indent = "  ".repeat(currentItemIndex.length - 1);
    lines[currentIndex] = `${indent}${newText} @`;
    await writeMarkdownFile(lines.join("\n"));
    console.log("Current item edited.");
}

// Show the current item
export async function showCurrentItem(): Promise<void> {
    const content = await readMarkdownFile();
    const lines = content.split("\n");
    const currentIndex = findCurrentItemIndex(lines);
    if (currentIndex !== -1) {
        console.log("Current item:", lines[currentIndex]);
    } else {
        console.log("No current item found.");
    }
}

// List all items
export async function listItems(): Promise<string[]> {
    const content = await readMarkdownFile();
    return content.split("\n");
}
