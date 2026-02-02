export interface TreeNode {
  key: string;
  name: string;
  children: TreeNode[];
  isCurrent: boolean;
}

export interface JsonFocus {
  focus: string;
  breadcrumb: string;
  key: string;
  isLeaf: boolean;
  isRoot: boolean;
  siblingCount?: number;
}

export interface JsonItem {
  display: string;
  key: string;
}
