import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnprocessableEntityResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiCreatedResponse,
  getSchemaPath,
  ApiExtraModels,
} from '@nestjs/swagger';
import { ApiErrorResponseDto, ApiSuccessResponseDto } from '../api/api-responses.dto.js';
import type { FilterSchema } from '../api/filter-schema.js';
import { buildListFilterOptionsExample } from '../api/filter-swagger.js';

/**
 * Documents an error response against the shared `ApiErrorResponseDto` schema,
 * with a concrete example for the given status.
 */
function apiErrorResponse(example: Record<string, unknown>) {
  return {
    schema: {
      allOf: [{ $ref: getSchemaPath(ApiErrorResponseDto) }],
      example,
    },
  };
}

/**
 * Applies standardized error-response decorators (401/403/404/422/500) to a controller method.
 */
export function ApiStandardErrors(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiExtraModels(ApiErrorResponseDto),
    ApiUnauthorizedResponse({
      description: 'JWT token is missing, expired, or invalid',
      ...apiErrorResponse({
        status: 'error',
        message: 'Unauthorized',
        data: null,
        error: { code: 'UNAUTHORIZED', message: 'JWT token is missing, expired, or invalid' },
      }),
    }),
    ApiForbiddenResponse({
      description: 'Insufficient permissions to perform this action',
      ...apiErrorResponse({
        status: 'error',
        message: 'Forbidden',
        data: null,
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions to perform this action' },
      }),
    }),
    ApiNotFoundResponse({
      description: 'The requested resource was not found',
      ...apiErrorResponse({
        status: 'error',
        message: 'Not found',
        data: null,
        error: { code: 'NOT_FOUND', message: 'The requested resource was not found' },
      }),
    }),
    ApiUnprocessableEntityResponse({
      description: 'Request body validation failed',
      ...apiErrorResponse({
        status: 'error',
        message: 'Validation failed',
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: [{ field: 'email', message: 'email must be a valid email address', code: 'isEmail' }],
        },
      }),
    }),
    ApiInternalServerErrorResponse({
      description: 'An unexpected internal server error occurred',
      ...apiErrorResponse({
        status: 'error',
        message: 'Internal server error',
        data: null,
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      }),
    }),
  );
}

/**
 * Documents a standardized single-item success response.
 */
export function ApiOkResponseStandard<T extends Type<any>>(
  model: T,
  options: { description?: string; isArray?: boolean } = {},
): MethodDecorator {
  return applyDecorators(
    ApiExtraModels(ApiSuccessResponseDto, model),
    ApiOkResponse({
      description: options.description ?? 'Success',
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiSuccessResponseDto) },
          {
            properties: {
              data: options.isArray
                ? { type: 'array', items: { $ref: getSchemaPath(model) } }
                : { $ref: getSchemaPath(model) },
            },
          },
        ],
      },
    }),
  );
}

/**
 * Documents a standardized single-item success response for HTTP 201 Created.
 */
export function ApiCreatedResponseStandard<T extends Type<any>>(
  model: T,
  options: { description?: string } = {},
): MethodDecorator {
  return applyDecorators(
    ApiExtraModels(ApiSuccessResponseDto, model),
    ApiCreatedResponse({
      description: options.description ?? 'Created',
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiSuccessResponseDto) },
          { properties: { data: { $ref: getSchemaPath(model) } } },
        ],
      },
    }),
  );
}

/**
 * Documents a standardized paginated success response.
 */
export function ApiOkResponsePaginated<T extends Type<any>>(
  model: T,
  options: { description?: string; filterSchema?: FilterSchema } = {},
): MethodDecorator {
  const filterOptionsExample = options.filterSchema?.length
    ? buildListFilterOptionsExample(options.filterSchema)
    : undefined;

  return applyDecorators(
    ApiExtraModels(ApiSuccessResponseDto, model),
    ApiOkResponse({
      description: options.description ?? 'Paginated success',
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiSuccessResponseDto) },
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
              ...(filterOptionsExample
                ? {
                    meta: {
                      type: 'object',
                      properties: {
                        pagination: {
                          type: 'object',
                          properties: {
                            total: { type: 'number', example: 0 },
                            page: { type: 'number', example: 1 },
                            limit: { type: 'number', example: 10 },
                            totalPages: { type: 'number', example: 0 },
                          },
                        },
                        filterOptions: {
                          type: 'array',
                          example: filterOptionsExample,
                        },
                      },
                    },
                  }
                : {}),
            },
          },
        ],
      },
    }),
  );
}
