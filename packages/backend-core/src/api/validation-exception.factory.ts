import { UnprocessableEntityException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { ApiErrorCode, type FieldError } from '@core/api-contracts';

/**
 * Flattens class-validator's `ValidationError[]` into the shared
 * `FieldError[]` shape the client adapter maps back onto form fields.
 * Nested objects are addressed with dotted paths (`lines.0.quantity`).
 */
export function flattenValidationErrors(errors: ValidationError[], parentPath = ''): FieldError[] {
  return errors.flatMap((error) => {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;
    const own: FieldError[] = Object.entries(error.constraints ?? {}).map(([code, message]) => ({
      field: path,
      message,
      code,
    }));
    const nested = error.children?.length ? flattenValidationErrors(error.children, path) : [];
    return [...own, ...nested];
  });
}

/**
 * The `ValidationPipe.exceptionFactory`. Throws a 422 whose payload is the
 * shared error shape (matching the documented `Request body validation failed`
 * response), so `ApiExceptionFilter` passes the field-level `details` straight
 * through to the client.
 */
export function validationExceptionFactory(errors: ValidationError[]): UnprocessableEntityException {
  return new UnprocessableEntityException({
    code: ApiErrorCode.VALIDATION_ERROR,
    message: 'Validation failed',
    details: flattenValidationErrors(errors),
  });
}
