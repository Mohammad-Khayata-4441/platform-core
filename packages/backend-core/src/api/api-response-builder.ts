import type {
  ApiErrorResponse,
  ApiMeta,
  ApiSuccessResponse,
  FieldError,
  ListFilterField,
} from '@core/api-contracts';
import { ApiErrorCode } from '@core/api-contracts';
import { ApiQueryOptionsDto } from './api-query-options.dto.js';
import { buildListFilterOptionsExample } from './filter-swagger.js';
import type { FilterSchema } from './filter-schema.js';

export class ApiResponseBuilder {
  static success<T>(data: T, message = 'Success', meta?: ApiMeta): ApiSuccessResponse<T> {
    return { status: 'success', message, data, meta };
  }

  static error(
    message: string,
    code: ApiErrorCode | string = ApiErrorCode.INTERNAL_ERROR,
    details?: FieldError[],
  ): ApiErrorResponse {
    return {
      status: 'error',
      message,
      data: null,
      error: details ? { code, message, details } : { code, message },
    };
  }

  static buildListFilterOptions(schema: FilterSchema): ListFilterField[] {
    return buildListFilterOptionsExample(schema);
  }

  static buildPaginationMeta(
    query: ApiQueryOptionsDto | undefined,
    total: number,
    filterSchema?: FilterSchema,
  ): ApiMeta {
    const page = query?.page && query.page > 0 ? query.page : 1;
    const limit = query?.limit && query.limit > 0 ? query.limit : 10;

    const meta: ApiMeta = {
      pagination: {
        total,
        page,
        limit,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
      },
    };

    if (filterSchema?.length) {
      meta.filterOptions = ApiResponseBuilder.buildListFilterOptions(filterSchema);
    }

    return meta;
  }
}
