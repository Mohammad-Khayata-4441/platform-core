import { applyDecorators, HttpCode, HttpStatus, Type } from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiParam } from '@nestjs/swagger';
import type { FilterSchema } from '../api/filter-schema.js';
import {
  ApiCreatedResponseStandard,
  ApiOkResponsePaginated,
  ApiOkResponseStandard,
  ApiStandardErrors,
} from './api-swagger.decorators.js';

/** OpenAPI text for `@ApiOperation` on CRUD routes. */
export type CrudOperationDoc = {
  summary: string;
  description?: string;
};

/** Override defaults for the `:id` path parameter (name stays `id` unless overridden). */
export type CrudIdParamDoc = {
  name?: string;
  description?: string;
  example?: string;
};

const DEFAULT_ID_PARAM = {
  name: 'id',
  description: 'Resource UUID',
  example: '018e1234-abcd-7000-a001-000000000001',
} as const;

function apiOperationFrom(doc: CrudOperationDoc) {
  return ApiOperation({
    summary: doc.summary,
    ...(doc.description !== undefined ? { description: doc.description } : {}),
  });
}

function mergedIdParam(override?: CrudIdParamDoc) {
  return { ...DEFAULT_ID_PARAM, ...override };
}

/**
 * Composite Swagger + error docs for `GET /collection` (paginated list).
 */
export function CrudList<T extends Type<unknown>>(
  model: T,
  options: {
    operation: CrudOperationDoc;
    responseDescription?: string;
    filterSchema?: FilterSchema;
  },
): MethodDecorator {
  return applyDecorators(
    apiOperationFrom(options.operation),
    ApiOkResponsePaginated(model, {
      description: options.responseDescription,
      filterSchema: options.filterSchema,
    }),
    ApiStandardErrors(),
  );
}

/**
 * Composite Swagger + error docs for `GET /:id`.
 */
export function CrudShow<T extends Type<unknown>>(
  model: T,
  options: {
    operation: CrudOperationDoc;
    responseDescription?: string;
    idParam?: CrudIdParamDoc;
  },
): MethodDecorator {
  const id = mergedIdParam(options.idParam);
  return applyDecorators(
    apiOperationFrom(options.operation),
    ApiParam({
      name: id.name,
      description: id.description,
      example: id.example,
    }),
    ApiOkResponseStandard(model, { description: options.responseDescription }),
    ApiStandardErrors(),
  );
}

/**
 * Composite Swagger + error docs for `POST /collection` (201 + envelope).
 */
export function CrudCreate<T extends Type<unknown>>(
  model: T,
  options: {
    operation: CrudOperationDoc;
    responseDescription?: string;
  },
): MethodDecorator {
  return applyDecorators(
    apiOperationFrom(options.operation),
    ApiCreatedResponseStandard(model, { description: options.responseDescription }),
    ApiStandardErrors(),
  );
}

/**
 * Composite Swagger + error docs for `PATCH /:id`.
 */
export function CrudUpdate<T extends Type<unknown>>(
  model: T,
  options: {
    operation: CrudOperationDoc;
    responseDescription?: string;
    idParam?: CrudIdParamDoc;
  },
): MethodDecorator {
  const id = mergedIdParam(options.idParam);
  return applyDecorators(
    apiOperationFrom(options.operation),
    ApiParam({
      name: id.name,
      description: id.description,
      example: id.example,
    }),
    ApiOkResponseStandard(model, { description: options.responseDescription }),
    ApiStandardErrors(),
  );
}

/**
 * Composite Swagger + error docs for `DELETE /:id` (204 No Content).
 */
export function CrudDelete(options: {
  operation: CrudOperationDoc;
  noContentDescription?: string;
  idParam?: CrudIdParamDoc;
}): MethodDecorator {
  const id = mergedIdParam(options.idParam);
  return applyDecorators(
    HttpCode(HttpStatus.NO_CONTENT),
    apiOperationFrom(options.operation),
    ApiParam({
      name: id.name,
      description: id.description,
      example: id.example,
    }),
    ApiNoContentResponse({ description: options.noContentDescription ?? 'Deleted successfully' }),
    ApiStandardErrors(),
  );
}
