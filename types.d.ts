interface Config {
    filePath: string;
}

interface TreeNode {
    key: string;
    name: string;
    children: TreeNode[];
    isCurrent: boolean;
}
