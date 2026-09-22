import {
  Body,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Type,
  UsePipes,
} from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiQueryOptionsDto } from '../api/api-query-options.dto.js';
import { ApiResponseBuilder } from '../api/api-response-builder.js';
import { buildPrismaOrderBy, buildPrismaWhere, resolvePagination } from '../api/api-query.utils.js';
import type { FilterSchema } from '../api/filter-schema.js';
import { ApiFilterQuery } from '../decorators/api-filter-query.decorator.js';
import {
  CrudCreate,
  CrudDelete,
  CrudList,
  CrudShow,
  CrudUpdate,
  type CrudIdParamDoc,
  type CrudOperationDoc,
} from '../decorators/crud-swagger.decorators.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { RequirePermission } from '../auth/require-permission.decorator.js';
import type { RequestUser } from '../auth/request-user.js';
import type { PermissionKey } from '@core/api-contracts';
import { createClassDtoBodyPipe } from './class-dto-body.pipe.js';
import { ICrudService } from './crud-service.js';
import {
  BulkDeleteBodyDto,
  BulkResultResponseDto,
  createBulkUpdateBodyDto,
} from './bulk.dto.js';

/** OpenAPI fragments for each verb; nested under `openApi` in {@link CreateCrudControllerConfig}. */
export type CrudOpenApi = {
  list: {
    operation: CrudOperationDoc;
    responseDescription?: string;
  };
  show: {
    operation: CrudOperationDoc;
    responseDescription?: string;
    idParam?: CrudIdParamDoc;
  };
  create: {
    operation: CrudOperationDoc;
    responseDescription?: string;
  };
  update: {
    operation: CrudOperationDoc;
    responseDescription?: string;
    idParam?: CrudIdParamDoc;
  };
  delete: {
    operation: CrudOperationDoc;
    noContentDescription?: string;
    idParam?: CrudIdParamDoc;
  };
};


export type CrudBulkOpenApi = {
  bulkDelete?: CrudOperationDoc;
  bulkUpdate?: CrudOperationDoc;
};

/** Required permission per CRUD verb; the factory applies `@RequirePermission` metadata to every generated route. */
export type CrudPermissionConfig = {
  view: PermissionKey;
  create: PermissionKey;
  update: PermissionKey;
  delete: PermissionKey;
};

export type CreateCrudControllerConfig<TResponse, TCreateDto, TUpdateDto> = {
  responseDto: Type<TResponse>;
  createDto: Type<TCreateDto>;
  updateDto: Type<TUpdateDto>;
  openApi: CrudOpenApi;
  /** Per-resource filterable fields; drives Swagger docs and Prisma where safelist. */
  filterSchema?: FilterSchema;
  /** Optional Swagger doc overrides for the always-on bulk routes (`DELETE /resource`, `PATCH /resource`). */
  bulk?: CrudBulkOpenApi;
  /** Required permission per CRUD verb. */
  permissions: CrudPermissionConfig;
};

/**
 * Returns a Nest controller base class with standard CRUD routes, Swagger, tenant-scoped
 * service calls, pagination/filter/sort list options, and {@link ApiResponseBuilder} envelopes.
 *
 * Concrete resources extend the returned class and supply `@Controller`, guards, and
 * `super(service, resourceLabel)`.
 *
 * Override protected hooks for HTTP-level customization; keep domain rules on the service.
 */
export function createCrudController<TResponse, TCreateDto, TUpdateDto>(
  config: CreateCrudControllerConfig<TResponse, TCreateDto, TUpdateDto>,
): new (
  service: ICrudService<TResponse, TCreateDto, TUpdateDto>,
  resourceLabel: string,
) => object {
  const { responseDto, createDto, updateDto, openApi, filterSchema, bulk, permissions } = config;
  const bulkOpenApi = bulk ?? {};
  const bulkUpdateBodyDto = createBulkUpdateBodyDto(updateDto);

  class StandardCrudControllerBase {
    constructor(
      protected readonly service: ICrudService<TResponse, TCreateDto, TUpdateDto>,
      protected readonly resourceLabel: string,
    ) { }

    protected getFilterSchema(): FilterSchema | undefined {
      return filterSchema;
    }

    /** Options object passed to {@link ICrudService.list} (pagination, where, orderBy). */
    protected buildListOptions(_user: RequestUser, query: ApiQueryOptionsDto): Record<string, any> {
      const { skip, limit } = resolvePagination(query);
      return {
        skip,
        take: limit,
        where: buildPrismaWhere(query, this.getFilterSchema()),
        orderBy: buildPrismaOrderBy(query),
      };
    }

    protected async beforeCreate(_user: RequestUser, _dto: TCreateDto): Promise<void> { }

    protected async beforeUpdate(
      _user: RequestUser,
      _id: string,
      _dto: TUpdateDto,
    ): Promise<void> { }

    protected async beforeDelete(_user: RequestUser, _id: string): Promise<void> { }

    protected async afterCreate(_user: RequestUser, _item: TResponse): Promise<void> { }

    protected async afterUpdate(_user: RequestUser, _item: TResponse): Promise<void> { }

  /** Hook before bulk partial update — throw to abort the whole request. */
  protected async beforeBulkUpdate(
    _user: RequestUser,
    _items: Array<{ id: string } & Partial<TUpdateDto>>,
  ): Promise<void> {}

  /** Hook after bulk partial update — receives the aggregated result. */
  protected async afterBulkUpdate(
    _user: RequestUser,
    _items: Array<{ id: string } & Partial<TUpdateDto>>,
    _result: { total: number; succeeded: number; failed: number; errors: unknown[] },
  ): Promise<void> {}

    @Get()
    @CrudList(responseDto, { ...openApi.list, filterSchema })
    async list(@CurrentUser() user: RequestUser, @Query() query: ApiQueryOptionsDto) {
      const options = this.buildListOptions(user, query);
      const result = await this.service.list(user.tenantId, options);
      const meta = ApiResponseBuilder.buildPaginationMeta(
        query,
        result.total,
        this.getFilterSchema(),
      );
      return ApiResponseBuilder.success(result.data, `${this.resourceLabel} list`, meta);
    }

    @Get(':id')
    @CrudShow(responseDto, openApi.show)
    async show(@CurrentUser() user: RequestUser, @Param('id') id: string) {
      const item = await this.service.findById(user.tenantId, id);
      return ApiResponseBuilder.success(item, `${this.resourceLabel} details`);
    }

    @Post()
    @CrudCreate(responseDto, openApi.create)
    @ApiBody({ type: createDto, required: true })
    @UsePipes(createClassDtoBodyPipe(createDto as new (...args: unknown[]) => unknown))
    async create(@CurrentUser() user: RequestUser, @Body() dto: TCreateDto) {
      await this.beforeCreate(user, dto);
      const created = await this.service.create(user.tenantId, dto);
      await this.afterCreate(user, created);
      return ApiResponseBuilder.success(created, `${this.resourceLabel} created`);
    }

    @Patch(':id')
    @CrudUpdate(responseDto, openApi.update)
    @ApiBody({ type: updateDto, required: true })
    @UsePipes(createClassDtoBodyPipe(updateDto as new (...args: unknown[]) => unknown))
    async update(
      @CurrentUser() user: RequestUser,
      @Param('id') id: string,
      @Body() dto: TUpdateDto,
    ) {
      await this.beforeUpdate(user, id, dto);
      const updated = await this.service.update(user.tenantId, id, dto);
      await this.afterUpdate(user, updated);
      return ApiResponseBuilder.success(updated, `${this.resourceLabel} updated`);
    }

    @Delete(':id')
    @CrudDelete(openApi.delete)
    async delete(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
      await this.beforeDelete(user, id);
      await this.service.delete(user.tenantId, id);
    }

    @Delete()
    @ApiOperation(bulkOpenApi.bulkDelete ?? { summary: 'Bulk delete by ids' })
    @ApiBody({ type: BulkDeleteBodyDto, required: true })
    @ApiOkResponse({
      type: BulkResultResponseDto,
      description: 'Bulk delete result ({ total, succeeded, failed, errors })',
    })
    async bulkDelete(
      @CurrentUser() user: RequestUser,
      @Body() body: BulkDeleteBodyDto,
    ) {
      const result = await this.service.bulkDelete(user.tenantId, body.ids);
      return ApiResponseBuilder.success(result, `${this.resourceLabel} bulk delete`);
    }

    @Patch()
    @ApiOperation(bulkOpenApi.bulkUpdate ?? { summary: 'Bulk partial update' })
    @ApiBody({ type: bulkUpdateBodyDto.arrayDto, required: true })
    @ApiOkResponse({
      type: BulkResultResponseDto,
      description: 'Bulk partial-update result ({ total, succeeded, failed, errors })',
    })
    @UsePipes(createClassDtoBodyPipe(bulkUpdateBodyDto.arrayDto))
    async bulkUpdate(
      @CurrentUser() user: RequestUser,
      @Body() body: { items: Array<{ id: string } & Partial<TUpdateDto>> },
    ) {
      await this.beforeBulkUpdate(user, body.items);
      const result = await this.service.bulkUpdate(user.tenantId, body.items);
      await this.afterBulkUpdate(user, body.items, result);
      return ApiResponseBuilder.success(result, `${this.resourceLabel} bulk update`);
    }
  }

  if (filterSchema) {
    const descriptor = Object.getOwnPropertyDescriptor(StandardCrudControllerBase.prototype, 'list')!;
    ApiFilterQuery(filterSchema)(StandardCrudControllerBase.prototype, 'list', descriptor);
  }

  const permissionByMethod: Array<[string, PermissionKey]> = [
    ['list', permissions.view],
    ['show', permissions.view],
    ['create', permissions.create],
    ['update', permissions.update],
    ['delete', permissions.delete],
    ['bulkDelete', permissions.delete],
    ['bulkUpdate', permissions.update],
  ];

  for (const [method, permission] of permissionByMethod) {
    const descriptor = Object.getOwnPropertyDescriptor(StandardCrudControllerBase.prototype, method)!;
    RequirePermission(permission)(StandardCrudControllerBase.prototype, method, descriptor);
  }

  return StandardCrudControllerBase as new (
    service: ICrudService<TResponse, TCreateDto, TUpdateDto>,
    resourceLabel: string,
  ) => object;
}
