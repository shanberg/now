import { bundle } from "https://deno.land/x/emit@0.40.0/mod.ts";

const entryPoint = new URL("./index.ts", import.meta.url);
const result = await bundle(entryPoint);

const { code } = result;
await Deno.writeTextFile("./dist/bundle.js", code);

console.log("Bundling complete. Output written to dist/bundle.js");
