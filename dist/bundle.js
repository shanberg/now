const DATA_STR = {
    currentItemMarker: "@",
    focus: "▶",
    indent: "  ",
    lineSeparator: "\n",
    lineMarker: "- ",
    focusPrevious: "▷",
    placeholder: "______"
};
const DATA_STR1 = {
    ...DATA_STR,
    rootFocus: "Root Focus"
};
`${DATA_STR1.lineMarker}${DATA_STR1.rootFocus} ${DATA_STR1.currentItemMarker}\n`;
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
    const { runJsonFocus, runJsonItems } = await import("./ui/jsonCLI.ts");
    const sub = args[1];
    if (sub === "focus") {
        await runJsonFocus();
    } else if (sub === "items") {
        await runJsonItems();
    } else {
        console.error("json requires 'focus' or 'items'");
        Deno.exit(1);
    }
    Deno.exit(0);
}
if (cmd === "init") {
    const { runInit } = await import("./ui/jsonCLI.ts");
    await runInit();
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
