import { bundle } from "jsr:@deno/emit";

const repoRoot = new URL("../", import.meta.url);
const entryPoint = new URL("./index.ts", import.meta.url);

const configPath = new URL("../deno.json", import.meta.url);
const config = JSON.parse(await Deno.readTextFile(configPath)) as {
  imports?: Record<string, string>;
};
const importMap = {
  baseUrl: repoRoot.href,
  imports: config.imports ?? {},
};

const result = await bundle(entryPoint, {
  importMap,
  allowRemote: true,
});

const { code } = result;
const outPath = new URL("../dist/bundle.js", import.meta.url);
await Deno.writeTextFile(outPath, code);

console.log("Bundling complete. Output written to dist/bundle.js");
