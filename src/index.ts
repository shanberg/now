import { Command } from "https://deno.land/x/cliffy@v0.25.7/command/mod.ts";
import { interactiveTUI } from "./interactiveTUI.ts";
import { unixCLI } from "./unixCLI.ts";

console.clear();
await new Command()
  .name("focus")
  .version("0.1.0")
  .description("Stay on target while yak-shaving")
  .command("tui [path:string]", "Start the TUI")
  .action(({ path }) => {
    interactiveTUI(path);
  })
  .command("status [path:string]", "Display the current status")
  .action(({ path }) => {
    unixCLI("status", path);
  })
  .command("complete [path:string]", "Complete the current frame")
  .action(({ path }) => {
    unixCLI("complete", path);
  })
  .command("add [path:string] <items:string>", "Add nested frames")
  .action(({ path, items }) => {
    unixCLI("add", path, items);
  })
  .command("later [path:string] <items:string>", "Add follow-up frames")
  .action(({ path, items }) => {
    unixCLI("later", path, items);
  })
  .command(
    "edit [path:string] <newName:string>",
    "Edit the current frame's description",
  )
  .action(({ path, newName }) => {
    unixCLI("edit", path, newName);
  })
  .command("switch [path:string] <index:number>", "Switch to a different frame")
  .action(({ path, index }) => {
    unixCLI("switch", path, index);
  })
  .default("status")
  .parse(Deno.args);
