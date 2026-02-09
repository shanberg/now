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
if (cmd === "--version" || cmd === "-v") {
    const { VERSION } = await import("./consts.ts");
    console.log(VERSION);
    Deno.exit(0);
}
const MUTATION_COMMANDS = [
    "complete",
    "add",
    "later",
    "edit",
    "switch",
    "wrap",
    "move"
];
const isEmitJsonMutation = args[args.length - 1] === "--emit-json" && MUTATION_COMMANDS.includes(cmd);
if (cmd !== "json" && !isEmitJsonMutation) {
    false || console.clear();
}
if (cmd === "tui") {
    const { interactiveTUI } = await import("./ui/interactiveTUI.ts");
    await interactiveTUI();
    Deno.exit(0);
}
function parseKeyValueArgs(argv, startIndex) {
    const out = {};
    for(let i = startIndex; i < argv.length; i++){
        const arg = argv[i];
        if (arg.startsWith("--")) {
            const eq = arg.indexOf("=");
            if (eq !== -1) {
                out[arg.slice(2, eq)] = arg.slice(eq + 1);
            } else if (argv[i + 1] !== undefined) {
                out[arg.slice(2)] = argv[i + 1];
                i++;
            }
        }
    }
    return out;
}
if (cmd === "json") {
    const { runJsonFocus, runJsonItems, runJsonPreview } = await import("./ui/jsonCLI.ts");
    const sub = args[1];
    if (sub === "focus") {
        await runJsonFocus();
    } else if (sub === "items") {
        await runJsonItems();
    } else if (sub === "preview") {
        const opts = parseKeyValueArgs(args, 2);
        await runJsonPreview(opts["selected-key"], opts["action"], opts["move-target"]);
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
    ...MUTATION_COMMANDS,
    "dive-in",
    "next",
    "previous",
    "down",
    "up"
];
const COMMANDS_REQUIRING_ARG = [
    "add",
    "later",
    "edit",
    "switch",
    "wrap",
    "move"
];
if (cliCommands.includes(cmd)) {
    const c = cmd;
    const emitJson = MUTATION_COMMANDS.includes(c) && args[args.length - 1] === "--emit-json";
    const positionals = emitJson ? args.slice(1, -1) : args.slice(1);
    const options = emitJson ? {
        emitJson: true
    } : undefined;
    if (COMMANDS_REQUIRING_ARG.includes(c)) {
        if (positionals[0] === undefined) {
            console.error(`${c} requires an argument`);
            Deno.exit(1);
        }
    }
    await unixCLI(c, options, ...positionals);
    Deno.exit(0);
}
console.error(`Unknown command: ${cmd}`);
Deno.exit(1);
