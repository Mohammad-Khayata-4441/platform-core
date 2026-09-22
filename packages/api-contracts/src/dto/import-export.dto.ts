export type ImportRowError = {
    row: number;
    field?: string;
    message: string;
};

export type ImportResult = {
    totalRows: number;
    created: number;
    updated: number;
    skipped: number;
    errors: ImportRowError[];
    dryRun: boolean;
};

export interface ImportResultDto extends ImportResult {}
