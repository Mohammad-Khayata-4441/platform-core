/** Shared bulk-operation types consumed by the API client and dashboard. */

export type BulkError = {
    id?: string;
    message: string;
};

export type BulkResult = {
    total: number;
    succeeded: number;
    failed: number;
    errors: BulkError[];
};

/** A single bulk-update item: `id` (required) + any subset of the resource's update DTO fields. */
export type BulkUpdateItem<TUpdateDto> = { id: string } & Partial<TUpdateDto>;

export interface BulkDeleteResultDto extends BulkResult {}

export interface BulkUpdateResultDto extends BulkResult {}

export interface BulkDeleteBodyDto {
    ids: string[];
}

export interface BulkUpdateBodyDto<TUpdateDto> {
    items: BulkUpdateItem<TUpdateDto>[];
}