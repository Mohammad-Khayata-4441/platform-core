/**
 * The response envelope is declared once in `@core/api-contracts`.
 * backend-core re-exports the shared declarations instead of mirroring them.
 */
export type {
  ApiError,
  ApiErrorResponse,
  ApiSuccessResponse,
  ApiMeta,
  Cursor,
  Pagination as PaginationMeta,
} from '@core/api-contracts';

import type { ApiSuccessResponse } from '@core/api-contracts';

/** Convenience alias for a successful envelope. */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T>;
