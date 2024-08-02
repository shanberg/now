import {
  type SelectOption,
} from "https://deno.land/x/cliffy@v0.25.7/prompt/mod.ts";

interface TreeNode {
  key: string;
  name: string;
  children: TreeNode[];
  isCurrent: boolean;
}

export type SelectOptionWithPrimary = SelectOption & {
  primary?: boolean;
};
