export enum ApiErrorCode {
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    BAD_REQUEST = 'BAD_REQUEST',
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN',
    NOT_FOUND = 'NOT_FOUND',
    CONFLICT = 'CONFLICT',
    INTERNAL_ERROR = 'INTERNAL_ERROR',

    // Custom Business Codes
    USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
    INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
    // ... and more
}

/**
 * A single field-level validation failure carried inside an error response.
 * `field` mirrors the request DTO property name so the dashboard can attach
 * the message to the matching form field.
 */
export interface FieldError {
    field: string;
    message: string;
    code?: string;
}

/**
 * The `error` payload nested inside every error response envelope.
 * Serialized by the API runtime, documented by the Swagger decorators, and
 * consumed by the client's error adapter — all from this one declaration.
 */
export interface ApiError {
    code: ApiErrorCode | string;
    message: string;
    details?: FieldError[];
}
