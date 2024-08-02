import { bundle } from "jsr:@deno/emit";

const entryPoint = new URL("./index.ts", import.meta.url);
const result = await bundle(entryPoint);

const { code } = result;
await Deno.writeTextFile("./dist/bundle.js", code);

console.log("Bundling complete. Output written to dist/bundle.js");
