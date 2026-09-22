import { Injectable, StreamableFile } from '@nestjs/common';
import {
    buildInstructionsSheet,
    buildWorkbookBuffer,
    type SheetColumn,
    type WorkbookSheet,
} from '../import-export/index.js';
import { ApiQueryOptionsDto } from '../api/api-query-options.dto.js';
import { buildPrismaWhere } from '../api/api-query.utils.js';
import type { FilterSchema } from '../api/filter-schema.js';
import type { FindManyOptions, TenantEntity } from './crud-repository.js';

/** A single flat export row keyed by column key. */
export type ExportRow = Record<string, string | number | boolean>;

/**
 * Base class for Excel export of a tenant-scoped CRUD resource.
 *
 * Resources opt in by extending this class and implementing the abstract hooks:
 * column layout, row fetching, entity → row mapping, and the template example row.
 * Optional hooks (`buildExportContext`, `getInstructions`, `getTemplateExtraSheets`,
 * `buildTemplateContext`) provide custom-field enrichment and lookup sheets without
 * forcing those concepts onto resources that don't need them.
 *
 * The base owns the Excel buffer building, `StreamableFile` envelope, and the
 * filter-schema → Prisma `where` translation for the export query (mirroring the
 * shared `buildPrismaWhere` used by the standard list endpoint).
 */
@Injectable()
export abstract class CrudExportServiceBase<TEntity extends TenantEntity, TResponse = unknown> {
    /** Plural resource key, e.g. `items`, `units`. Used for sheet/file names. */
    protected abstract readonly resourceKey: string;

    protected getSheetName(): string {
        return this.resourceKey;
    }

    protected getExportMaxRows(): number {
        return 10_000;
    }

    protected getExportOrderBy(): Record<string, 'asc' | 'desc'> {
        return { createdAt: 'desc' };
    }

    protected getExportFileNamePrefix(): string {
        return `${this.resourceKey}-export`;
    }

    protected getTemplateFileName(): string {
        return `${this.resourceKey}-import-template.xlsx`;
    }

    /** Column layout for the export sheet (base + any custom/user-defined columns). */
    protected abstract getColumns(
        tenantId: string,
        context: unknown,
    ): Promise<SheetColumn[]>;

    /** Fetch the entities to export (with whatever relations the row mapper needs). */
    protected abstract fetchExportRows(
        tenantId: string,
        options: FindManyOptions,
    ): Promise<TEntity[]>;

    /** Optional enrichment computed once per export (custom-field values, etc.). */
    protected async buildExportContext(
        _tenantId: string,
        _entities: TEntity[],
    ): Promise<unknown> {
        return undefined;
    }

    protected abstract toExportRow(entity: TEntity, context: unknown): ExportRow;

    /** Per-resource per-column instructions; appended as an `Instructions` sheet. */
    protected getInstructions(): Array<{ column: string; description: string }> {
        return [];
    }

    /** Context computed once for the template (e.g. custom-field definitions). */
    protected async buildTemplateContext(_tenantId: string): Promise<unknown> {
        return undefined;
    }

    protected abstract buildTemplateExampleRow(
        tenantId: string,
        context: unknown,
    ): Promise<ExportRow | null>;

    /** Extra sheets appended to the template (e.g. a `Lookups` sheet). */
    protected async getTemplateExtraSheets(
        _tenantId: string,
        _context: unknown,
    ): Promise<WorkbookSheet[]> {
        return [];
    }

    private async buildSheets(
        tenantId: string,
        columns: SheetColumn[],
        rows: ExportRow[],
    ): Promise<WorkbookSheet[]> {
        const sheets: WorkbookSheet[] = [
            { name: this.getSheetName(), columns, rows },
        ];
        const instructions = this.getInstructions();
        if (instructions.length > 0) {
            sheets.push(buildInstructionsSheet([...instructions]));
        }
        return sheets;
    }

    private async toStreamableFile(sheets: WorkbookSheet[], filename: string): Promise<StreamableFile> {
        const buffer = await buildWorkbookBuffer(sheets);
        return new StreamableFile(buffer, {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            disposition: `attachment; filename="${filename}"`,
        });
    }

    async exportToExcel(
        tenantId: string,
        query: ApiQueryOptionsDto,
        filterSchema: FilterSchema | undefined,
    ): Promise<StreamableFile> {
        const where = buildPrismaWhere(query, filterSchema);
        const entities = await this.fetchExportRows(tenantId, {
            where,
            take: this.getExportMaxRows(),
            skip: 0,
            orderBy: this.getExportOrderBy(),
        });

        const exportContext = await this.buildExportContext(tenantId, entities);
        const columns = await this.getColumns(tenantId, exportContext);
        const rows = entities.map((entity) => this.toExportRow(entity, exportContext));

        const sheets = await this.buildSheets(tenantId, columns, rows);
        const filename = `${this.getExportFileNamePrefix()}-${new Date().toISOString().slice(0, 10)}.xlsx`;
        return this.toStreamableFile(sheets, filename);
    }

    async buildTemplate(tenantId: string): Promise<StreamableFile> {
        const templateContext = await this.buildTemplateContext(tenantId);
        const [columns, exampleRow, extraSheets] = await Promise.all([
            this.getColumns(tenantId, templateContext),
            this.buildTemplateExampleRow(tenantId, templateContext),
            this.getTemplateExtraSheets(tenantId, templateContext),
        ]);

        const sheets: WorkbookSheet[] = [
            { name: this.getSheetName(), columns, rows: exampleRow ? [exampleRow] : [] },
            ...extraSheets,
        ];
        const instructions = this.getInstructions();
        if (instructions.length > 0) {
            sheets.push(buildInstructionsSheet([...instructions]));
        }

        return this.toStreamableFile(sheets, this.getTemplateFileName());
    }
}