import { BadRequestException, Injectable } from '@nestjs/common';
import type { ImportResult } from '@core/api-contracts';
import { parseWorksheetRows } from '../import-export/excel-workbook.js';
import type { TenantEntity } from './crud-repository.js';
import type { ICrudService } from './crud-service.js';

const ALLOWED_IMPORT_MIME_TYPES = new Set([
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
]);

/** A parsed import row returned by the resource's `parseRow` hook. */
export type ParsedImportRow<TCreateDto, TUpdateDto> = {
    rowNumber: number;
    createDto: TCreateDto;
    updateDto: TUpdateDto;
    existingId?: string;
};

/**
 * Base class for Excel import (upsert) of a tenant-scoped CRUD resource.
 *
 * The base owns the workbook parsing, row iteration, dry-run handling, error
 * aggregation, and the create/update dispatch against the resource's
 * {@link ICrudService}. Resources implement only the resource-specific concerns:
 * - {@link buildImportContext} — precompute lookup maps / existing-key maps / definitions.
 * - {@link parseRow} — validate + map a raw row to `{ createDto, updateDto, existingId }`.
 *   `parseRow` is responsible for pushing validation errors and incrementing `result.skipped`
 *   for rows it rejects; the base only counts `created`/`updated` and the catch-all skipped
 *   for per-row persistence failures.
 */
@Injectable()
export abstract class CrudImportServiceBase<
    TEntity extends TenantEntity,
    TResponse,
    TCreateDto,
    TUpdateDto,
> {
    /** Plural resource key, e.g. `items`, `units`. Used to locate the export sheet. */
    protected abstract readonly resourceKey: string;

    protected getSheetName(): string {
        return this.resourceKey;
    }

    constructor(
        protected readonly crudService: ICrudService<TResponse, TCreateDto, TUpdateDto>,
    ) {}

    /** Precompute any resource-specific context shared across all rows (lookups, key maps). */
    protected abstract buildImportContext(tenantId: string): Promise<unknown>;

    /**
     * Validate and map a raw worksheet row.
     * Push errors to `result.errors` and increment `result.skipped` for rejected rows,
     * returning `null` so the base skips persistence.
     */
    protected abstract parseRow(
        rawRow: Record<string, unknown>,
        rowNumber: number,
        context: unknown,
        result: ImportResult,
    ): ParsedImportRow<TCreateDto, TUpdateDto> | null;

    protected validateFile(file?: Express.Multer.File): void {
        if (!file?.buffer?.length) {
            throw new BadRequestException('No file uploaded');
        }
        if (file.mimetype && !ALLOWED_IMPORT_MIME_TYPES.has(file.mimetype)) {
            throw new BadRequestException('File must be an Excel (.xlsx) spreadsheet');
        }
    }

    async importFromExcel(
        tenantId: string,
        file: Express.Multer.File,
        dryRun: boolean,
    ): Promise<ImportResult> {
        this.validateFile(file);

        const { rows } = await parseWorksheetRows(file.buffer, this.getSheetName());
        const context = await this.buildImportContext(tenantId);

        const result: ImportResult = {
            totalRows: rows.length,
            created: 0,
            updated: 0,
            skipped: 0,
            errors: [],
            dryRun,
        };

        for (let index = 0; index < rows.length; index++) {
            const rowNumber = index + 2;
            const rawRow = rows[index]!;

            const parsed = this.parseRow(rawRow, rowNumber, context, result);
            if (!parsed) continue;

            if (dryRun) {
                if (parsed.existingId) {
                    result.updated += 1;
                } else {
                    result.created += 1;
                }
                continue;
            }

            try {
                if (parsed.existingId) {
                    await this.crudService.update(tenantId, parsed.existingId, parsed.updateDto);
                    result.updated += 1;
                } else {
                    await this.crudService.create(tenantId, parsed.createDto);
                    result.created += 1;
                }
            } catch (error) {
                result.skipped += 1;
                result.errors.push({
                    row: rowNumber,
                    message: error instanceof Error ? error.message : 'Import failed for this row',
                });
            }
        }

        return result;
    }
}