import { ApiMeta } from "./ApiMeta";
import { ApiError } from "./ApiError";

export interface ApiSuccessResponse<T = any> {
    status: "success";
    data: T;
    message: string;
    meta?: ApiMeta;
}

/**
 * The single error envelope. The external shape is unchanged from the runtime
 * (`status`/`message`/`data`), with the machine-readable error nested under
 * `error` so field-level `details` survive the wire.
 */
export interface ApiErrorResponse {
    status: "error";
    data: null;
    message: string;
    error: ApiError;
}
