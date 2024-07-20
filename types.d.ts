interface Config {
    filePath: string;
}

type Line = string & {
    __brand: "Line";
};

type Item = string & {
    __brand: "Item";
};

type FileContent = string & {
    __brand: "FileContent";
};

type FormattedBreadcrumb = string & { __brand: "FormattedBreadcrumb" };

type ColorizedBreadcrumb = string & { __brand: "ColorizedBreadcrumb" };

type ColorizedFocus = string & { __brand: "ColorizedFocus" };
