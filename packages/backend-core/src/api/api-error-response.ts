import { HttpException } from '@nestjs/common';
import { ApiErrorCode, type ApiError, type ApiErrorResponse } from '@core/api-contracts';
import { ApiResponseBuilder } from './api-response-builder.js';

const STATUS_CODE_MAP: Record<number, ApiErrorCode> = {
  400: ApiErrorCode.BAD_REQUEST,
  401: ApiErrorCode.UNAUTHORIZED,
  403: ApiErrorCode.FORBIDDEN,
  404: ApiErrorCode.NOT_FOUND,
  409: ApiErrorCode.CONFLICT,
  422: ApiErrorCode.VALIDATION_ERROR,
  500: ApiErrorCode.INTERNAL_ERROR,
};

function codeForStatus(status: number): ApiErrorCode {
  return STATUS_CODE_MAP[status] ?? (status >= 500 ? ApiErrorCode.INTERNAL_ERROR : ApiErrorCode.BAD_REQUEST);
}

function fallbackMessageForStatus(status: number): string {
  if (status === 500) return 'Internal server error';
  return 'Request failed';
}

function messageFromPayload(payload: unknown, fallback: string): string {
  if (typeof payload === 'string' && payload.length > 0) return payload;
  if (payload && typeof payload === 'object') {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === 'string' && message.length > 0) return message;
    if (Array.isArray(message)) return message.map(String).join(', ');
  }
  return fallback;
}

/**
 * A payload that already carries the shared error fields (e.g. the validation
 * factory). Only these are passed through verbatim so `details` survive.
 */
function isStructuredError(payload: unknown): payload is Partial<ApiError> {
  return !!payload && typeof payload === 'object' && 'code' in payload && 'message' in payload;
}

/**
 * Maps any thrown value to the single error envelope. HttpExceptions keep their
 * status code; a payload carrying `code`/`message`/`details` (the shape the
 * validation factory throws) is passed through verbatim so field-level details
 * survive the wire.
 */
export function toErrorResponse(exception: unknown): { status: number; body: ApiErrorResponse } {
  if (!(exception instanceof HttpException)) {
    return {
      status: 500,
      body: ApiResponseBuilder.error(
        'Internal server error',
        ApiErrorCode.INTERNAL_ERROR,
        undefined,
      ),
    };
  }

  const status = exception.getStatus();
  const payload = exception.getResponse();
  const fallback = fallbackMessageForStatus(status);

  if (isStructuredError(payload)) {
    const message = typeof payload.message === 'string' && payload.message.length > 0 ? payload.message : fallback;
    return {
      status,
      body: ApiResponseBuilder.error(message, payload.code ?? codeForStatus(status), payload.details),
    };
  }

  const message = messageFromPayload(payload, fallback);
  return {
    status,
    body: ApiResponseBuilder.error(message, codeForStatus(status)),
  };
}
