import {
    Get,
    Post,
    Query,
    StreamableFile,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ApiBody,
    ApiConsumes,
    ApiOkResponse,
    ApiOperation,
    ApiProperty,
    ApiQuery,
} from '@nestjs/swagger';
import multer from 'multer';
import { ApiQueryOptionsDto } from '../api/api-query-options.dto.js';
import { ApiResponseBuilder } from '../api/api-response-builder.js';
import type { FilterSchema } from '../api/filter-schema.js';
import { ApiFilterQuery } from '../decorators/api-filter-query.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { RequirePermission } from '../auth/require-permission.decorator.js';
import type { RequestUser } from '../auth/request-user.js';
import type { PermissionKey } from '@core/api-contracts';
import { CrudExportServiceBase } from './crud-export-service.js';
import { CrudImportServiceBase } from './crud-import-service.js';
import type { TenantEntity } from './crud-repository.js';
import { ImportResultResponseDto } from './import-result.dto.js';
import type { CrudOperationDoc } from '../decorators/crud-swagger.decorators.js';

/** Minimal contract for an export service the controller base can drive. */
export type CrudExportServiceLike<TEntity extends TenantEntity = TenantEntity> = Pick<
    CrudExportServiceBase<TEntity>,
    'exportToExcel' | 'buildTemplate'
>;

/** Minimal contract for an import service the controller base can drive. */
export type CrudImportServiceLike<
    TEntity extends TenantEntity = TenantEntity,
> = Pick<
    CrudImportServiceBase<TEntity, unknown, unknown, unknown>,
    'importFromExcel'
>;

export type CrudImportExportOpenApi = {
    export: { operation: CrudOperationDoc };
    template: { operation: CrudOperationDoc };
    import: { operation: CrudOperationDoc };
};

export type CreateCrudImportExportControllerConfig = {
    filterSchema?: FilterSchema;
    openApi: CrudImportExportOpenApi;
    /** Required permission for export/template (`view`) and import (`create`). */
    permissions: { view: PermissionKey; create: PermissionKey };
};

class ImportFileDto {
    @ApiProperty({ type: 'string', format: 'binary', description: 'Excel file (.xlsx)' })
    file: unknown;
}

/**
 * Returns a Nest controller base class with three Excel endpoints relative to the
 * controller's `@Controller('<resource>')` path:
 *  - `GET    export`
 *  - `GET    import/template`
 *  - `POST   import`
 *
 * Concrete controllers extend the returned class and supply `@Controller`, guards,
 * `@ApiTags`, `@ApiBearerAuth`, and `super(exportService, importService)` — exactly
 * mirroring the {@link createCrudController} factory pattern. Domain rules stay on the
 * export/import services; this only wires HTTP, Swagger, and the multipart interceptor.
 */
export function createCrudImportExportController(
    config: CreateCrudImportExportControllerConfig,
): new (
    exportService: CrudExportServiceLike,
    importService: CrudImportServiceLike,
) => object {
    const { filterSchema, openApi, permissions } = config;

    class StandardCrudImportExportControllerBase {
        constructor(
            protected readonly exportService: CrudExportServiceLike,
            protected readonly importService: CrudImportServiceLike,
        ) {}

        @Get('export')
        @ApiOperation(openApi.export.operation)
        @ApiOkResponse({
            schema: { type: 'string', format: 'binary' },
            description: 'Excel workbook stream',
        })
        exportResources(
            @CurrentUser() user: RequestUser,
            @Query() query: ApiQueryOptionsDto,
        ): Promise<StreamableFile> {
            return this.exportService.exportToExcel(user.tenantId, query, filterSchema);
        }

        @Get('import/template')
        @ApiOperation(openApi.template.operation)
        @ApiOkResponse({
            schema: { type: 'string', format: 'binary' },
            description: 'Excel import template workbook',
        })
        downloadImportTemplate(@CurrentUser() user: RequestUser): Promise<StreamableFile> {
            return this.exportService.buildTemplate(user.tenantId);
        }

        @Post('import')
        @ApiOperation(openApi.import.operation)
        @ApiConsumes('multipart/form-data')
        @ApiBody({ type: ImportFileDto })
        @ApiQuery({
            name: 'dryRun',
            required: false,
            type: Boolean,
            description: 'When true, validates rows without creating or updating records.',
        })
        @ApiOkResponse({ type: ImportResultResponseDto })
        @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
        async importResources(
            @CurrentUser() user: RequestUser,
            @UploadedFile() file: Express.Multer.File,
            @Query('dryRun') dryRun?: string,
        ) {
            const isDryRun = dryRun === 'true' || dryRun === '1';
            const result = await this.importService.importFromExcel(
                user.tenantId,
                file,
                isDryRun,
            );
            const message = isDryRun
                ? 'Import validation completed'
                : 'Import completed';
            return ApiResponseBuilder.success(result, message);
        }
    }

    if (filterSchema) {
        const descriptor = Object.getOwnPropertyDescriptor(
            StandardCrudImportExportControllerBase.prototype,
            'exportResources',
        )!;
        ApiFilterQuery(filterSchema)(
            StandardCrudImportExportControllerBase.prototype,
            'exportResources',
            descriptor,
        );
    }

    const permissionByMethod: Array<[string, PermissionKey]> = [
        ['exportResources', permissions.view],
        ['downloadImportTemplate', permissions.view],
        ['importResources', permissions.create],
    ];

    for (const [method, permission] of permissionByMethod) {
        const descriptor = Object.getOwnPropertyDescriptor(
            StandardCrudImportExportControllerBase.prototype,
            method,
        )!;
        RequirePermission(permission)(
            StandardCrudImportExportControllerBase.prototype,
            method,
            descriptor,
        );
    }

    return StandardCrudImportExportControllerBase as new (
        exportService: CrudExportServiceLike,
        importService: CrudImportServiceLike,
    ) => object;
}