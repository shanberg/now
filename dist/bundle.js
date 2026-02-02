const DATA_STR = {
    currentItemMarker: "@",
    focus: "▶",
    indent: "  ",
    lineSeparator: "\n",
    lineMarker: "- ",
    focusPrevious: "▷",
    placeholder: "______"
};
`${DATA_STR.focus} `;
`${DATA_STR.focusPrevious} `;
const DATA_STR1 = {
    ...DATA_STR,
    rootFocus: "Root Focus"
};
function getInitialFocusContent(rootName) {
    const name = (rootName == null ? "" : rootName.replace(/\n/g, " ").trim()) || DATA_STR1.rootFocus;
    return `${DATA_STR1.lineMarker}${name} ${DATA_STR1.currentItemMarker}\n`;
}
getInitialFocusContent();
const args = Deno.args;
const cmd = args[0] ?? "status";
if (cmd !== "json") {
    false || console.clear();
}
if (cmd === "tui") {
    const { interactiveTUI } = await import("./ui/interactiveTUI.ts");
    await interactiveTUI();
    Deno.exit(0);
}
if (cmd === "json") {
    const { runJsonFocus, runJsonItems, runJsonPreview } = await import("./ui/jsonCLI.ts");
    const sub = args[1];
    if (sub === "focus") {
        await runJsonFocus();
    } else if (sub === "items") {
        await runJsonItems();
    } else if (sub === "preview") {
        let selectedKey;
        let action;
        let moveTargetKey;
        for(let i = 2; i < args.length; i++){
            const arg = args[i];
            if (arg === "--selected-key" && args[i + 1] !== undefined) {
                selectedKey = args[i + 1];
                i++;
            } else if (arg === "--action" && args[i + 1] !== undefined) {
                action = args[i + 1];
                i++;
            } else if (arg === "--move-target" && args[i + 1] !== undefined) {
                moveTargetKey = args[i + 1];
                i++;
            } else if (arg.startsWith("--selected-key=")) {
                selectedKey = arg.slice("--selected-key=".length);
            } else if (arg.startsWith("--action=")) {
                action = arg.slice("--action=".length);
            } else if (arg.startsWith("--move-target=")) {
                moveTargetKey = arg.slice("--move-target=".length);
            }
        }
        await runJsonPreview(selectedKey, action, moveTargetKey);
    } else {
        console.error("json requires 'focus', 'items', or 'preview'");
        Deno.exit(1);
    }
    Deno.exit(0);
}
if (cmd === "init") {
    const { runInit } = await import("./ui/jsonCLI.ts");
    await runInit(args[1]);
    Deno.exit(0);
}
const { unixCLI } = await import("./ui/unixCLI.ts");
const cliCommands = [
    "status",
    "complete",
    "add",
    "later",
    "edit",
    "switch",
    "wrap",
    "move",
    "dive-in",
    "next",
    "previous",
    "down",
    "up"
];
if (cliCommands.includes(cmd)) {
    const c = cmd;
    if (c === "add" || c === "later") {
        const items = args[1];
        if (items === undefined) {
            console.error(`${c} requires an argument`);
            Deno.exit(1);
        }
        await unixCLI(c, items);
    } else if (c === "edit" || c === "switch" || c === "wrap" || c === "move") {
        const arg = args[1];
        if (arg === undefined) {
            console.error(`${c} requires an argument`);
            Deno.exit(1);
        }
        await unixCLI(c, arg);
    } else {
        await unixCLI(c);
    }
    Deno.exit(0);
}
console.error(`Unknown command: ${cmd}`);
Deno.exit(1);
