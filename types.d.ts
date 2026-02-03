import {
  type SelectOption,
} from "https://deno.land/x/cliffy@v0.25.7/prompt/mod.ts";

export type { TreeNode } from "now-format";

export type SelectOptionWithPrimary = SelectOption & {
  primary?: boolean;
};
