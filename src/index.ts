import { Command } from "https://deno.land/x/cliffy@v0.25.7/command/mod.ts";
import { interactiveTUI } from "./ui/interactiveTUI.ts";
import { unixCLI } from "./ui/unixCLI.ts";
import { D } from "./consts.ts";

D || console.clear();
await new Command()
  .name("focus")
  .version("0.1.0")
  .description("Stay on target while yak-shaving")
  .command("tui", "Start the TUI")
  .action(() => {
    interactiveTUI();
  })
  .command("status", "Display the current status")
  .action(() => {
    unixCLI("status");
  })
  .command("complete", "Complete the current frame")
  .action(() => {
    unixCLI("complete");
  })
  .command("add <items:string>", "Add nested frames")
  .arguments("<items:string>")
  .action((_options, items) => {
    unixCLI("add", items);
  })
  .command("later <items:string>", "Add follow-up frames")
  .arguments("<items:string>")
  .action((_options, items) => {
    unixCLI("later", items);
  })
  .command(
    "edit <newName:string>",
    "Edit the current frame's description",
  )
  .arguments("<newName:string>")
  .action((_options, newName) => {
    unixCLI("edit", newName);
  })
  .command("switch <index:string>", "Switch to a different frame")
  .arguments("<index:string>")
  .action((_options, index: string) => {
    unixCLI("switch", index);
  })
  .default("status")
  .parse(Deno.args);
