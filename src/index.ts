import { D } from "./consts.ts";

const args = Deno.args;
const cmd = args[0] ?? "status";

const MUTATION_COMMANDS = [
  "complete",
  "add",
  "later",
  "edit",
  "switch",
  "wrap",
  "move",
] as const;

const isEmitJsonMutation =
  args[args.length - 1] === "--emit-json" &&
  MUTATION_COMMANDS.includes(cmd as (typeof MUTATION_COMMANDS)[number]);
if (cmd !== "json" && !isEmitJsonMutation) {
  D || console.clear();
}

if (cmd === "tui") {
  const { interactiveTUI } = await import("./ui/interactiveTUI.ts");
  await interactiveTUI();
  Deno.exit(0);
}

if (cmd === "json") {
  const { runJsonFocus, runJsonItems, runJsonPreview } = await import(
    "./ui/jsonCLI.ts"
  );
  const sub = args[1];
  if (sub === "focus") {
    await runJsonFocus();
  } else if (sub === "items") {
    await runJsonItems();
  } else if (sub === "preview") {
    let selectedKey: string | undefined;
    let action: string | undefined;
    let moveTargetKey: string | undefined;
    for (let i = 2; i < args.length; i++) {
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
  ...MUTATION_COMMANDS,
  "dive-in",
  "next",
  "previous",
  "down",
  "up",
] as const;

const COMMANDS_REQUIRING_ARG: readonly string[] = [
  "add",
  "later",
  "edit",
  "switch",
  "wrap",
  "move",
];

if (cliCommands.includes(cmd as (typeof cliCommands)[number])) {
  const c = cmd as (typeof cliCommands)[number];
  const emitJson =
    MUTATION_COMMANDS.includes(c as (typeof MUTATION_COMMANDS)[number]) &&
    args[args.length - 1] === "--emit-json";
  const positionals = emitJson ? args.slice(1, -1) : args.slice(1);
  const options = emitJson ? { emitJson: true } : undefined;

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
