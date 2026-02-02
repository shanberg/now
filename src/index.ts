import { D } from "./consts.ts";

const args = Deno.args;
const cmd = args[0] ?? "status";

if (cmd !== "json") {
  D || console.clear();
}

if (cmd === "tui") {
  const { interactiveTUI } = await import("./ui/interactiveTUI.ts");
  await interactiveTUI();
  Deno.exit(0);
}

const {
  runInit,
  runJsonFocus,
  runJsonItems,
  unixCLI,
} = await import("./ui/unixCLI.ts");

if (cmd === "json") {
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
  await runInit();
  Deno.exit(0);
}

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
  "up",
] as const;

if (cliCommands.includes(cmd as (typeof cliCommands)[number])) {
  const c = cmd as (typeof cliCommands)[number];
  if (c === "add" || c === "later") {
    const items = args[1];
    if (items === undefined) {
      console.error(`${c} requires an argument`);
      Deno.exit(1);
    }
    await unixCLI(c, items);
  } else if (
    c === "edit" ||
    c === "switch" ||
    c === "wrap" ||
    c === "move"
  ) {
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
