import { Command } from "https://deno.land/x/cliffy@v0.25.7/command/mod.ts";
import { interactiveTUI } from "./interactiveTUI.ts";
import { unixCLI } from "./unixCLI.ts";
import { D } from "./consts.ts";

D || console.clear();
await new Command()
  .name("focus")
  .version("0.1.0")
  .description("Stay on target while yak-shaving")
  .command("tui [path:string]", "Start the TUI")
  .arguments("[path:string]")
  .action((options, path) => {
    interactiveTUI(path);
  })
  .command("status [path:string]", "Display the current status")
  .arguments("[path:string]")
  .action((options, path) => {
    unixCLI("status", path);
  })
  .command("complete [path:string]", "Complete the current frame")
  .arguments("[path:string]")
  .action((options, path) => {
    unixCLI("complete", path);
  })
  .command("add [path:string] <items:string>", "Add nested frames")
  .arguments("[path:string] <items:string>")
  .action((options, path, items) => {
    unixCLI("add", path, items);
  })
  .command("later [path:string] <items:string>", "Add follow-up frames")
  .arguments("[path:string] <items:string>")
  .action((options, path, items) => {
    unixCLI("later", path, items);
  })
  .command(
    "edit [path:string] <newName:string>",
    "Edit the current frame's description",
  )
  .arguments("[path:string] <newName:string>")
  .action((options, path, newName) => {
    unixCLI("edit", path, newName);
  })
  .command("switch [path:string] <index:number>", "Switch to a different frame")
  .arguments("[path:string] <index:number>")
  .action((options, path, index) => {
    unixCLI("switch", path, index);
  })
  .default("status")
  .parse(Deno.args);
