export type SheetColumn = {
    key: string;
    header: string;
    width?: number;
};

export type WorkbookSheet = {
    name: string;
    columns: SheetColumn[];
    rows: Record<string, unknown>[];
};
