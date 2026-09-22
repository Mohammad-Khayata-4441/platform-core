import type { components, operations, paths } from "../../types/index"

type HttpMethod = "get" | "put" | "post" | "delete" | "options" | "head" | "patch" | "trace"
type NotNeverOrUndefined<T> = [Exclude<T, undefined>] extends [never] ? never : Exclude<T, undefined>

type OperationFor<Path extends ApiPath, Method extends HttpMethod> = Method extends keyof paths[Path]
    ? NotNeverOrUndefined<paths[Path][Method]>
    : never

type WithContent<T> = T extends { content: infer Content } ? Content : never
type JsonContent<T> = T extends { "application/json": infer Payload } ? Payload : never
type RequestContent<T> =
    T extends { "application/json": infer Payload } ? Payload :
    T extends { "*/*": infer Payload } ? Payload :
    T extends { "multipart/form-data": infer Payload } ? Payload :
    never

type ResponseByCode<Responses, Code extends number> = Code extends keyof Responses
    ? Responses[Code]
    : never

type SuccessResponse<Responses> =
    | ResponseByCode<Responses, 200>
    | ResponseByCode<Responses, 201>
    | ResponseByCode<Responses, 202>
    | ResponseByCode<Responses, 203>
    | ResponseByCode<Responses, 204>
    | ResponseByCode<Responses, 205>
    | ResponseByCode<Responses, 206>
    | ResponseByCode<Responses, 207>
    | ResponseByCode<Responses, 208>
    | ResponseByCode<Responses, 226>
    | ("default" extends keyof Responses ? Responses["default"] : never)

// ── Re-exports ──
export type ApiPaths = paths
export type ApiComponents = components
export type ApiOperations = operations

// ── Path & Method helpers ──
export type ApiPath = keyof paths

export type ApiMethod<Path extends ApiPath = ApiPath> = {
    [Method in HttpMethod]: OperationFor<Path, Method> extends never ? never : Method
}[HttpMethod]


export type ApiPathByMethod<Method extends HttpMethod> = {
    [Path in ApiPath]: OperationFor<Path, Method> extends never ? never : Path
}[ApiPath]



// ── Parameter helpers ──
export type ApiPathParams<Path extends ApiPath, Method extends HttpMethod> =
    OperationFor<Path, Method> extends { parameters: { path: infer Params } }
    ? Params
    : never

export type ApiQueryParams<Path extends ApiPath, Method extends HttpMethod> =
    OperationFor<Path, Method> extends { parameters: { query: infer Params } }
    ? Params
    : never

export type ApiHeaderParams<Path extends ApiPath, Method extends HttpMethod> =
    OperationFor<Path, Method> extends { parameters: { header: infer Params } }
    ? Params
    : never

export type ApiCookieParams<Path extends ApiPath, Method extends HttpMethod> =
    OperationFor<Path, Method> extends { parameters: { cookie: infer Params } }
    ? Params
    : never

// ── Request / Response body helpers ──
export type ApiRequestBody<P extends ApiPath, M extends keyof paths[P]> =
    Operation<P, M> extends { requestBody: { content: { "application/json": infer J } } }
    ? J
    : Operation<P, M> extends { requestBody: { content: { "multipart/form-data": infer J } } }
    ? J
    : never;

type Operation<P extends ApiPath, M extends keyof paths[P]> = paths[P][M];
export type ApiResponse<P extends ApiPath, M extends keyof paths[P]> =
    Operation<P, M> extends { responses: infer R }
    ? {
        [K in keyof R]: K extends number
        ? (K extends 200 | 201 | 202 | 204 | 206 ? (R[K] extends { content: { "application/json": infer J } } ? J : never) : never)
        : K extends "default" ? (R[K] extends { content: { "application/json": infer J } } ? J : never) : never
    }[keyof R]
    : never;

// ── Operation-level helpers ──
export type ApiOperationId = keyof operations

export type ApiOperationRequestBody<OperationId extends ApiOperationId> =
    RequestContent<
        WithContent<
            operations[OperationId] extends { requestBody?: infer RequestBody }
            ? RequestBody
            : never
        >
    >

export type ApiOperationResponse<OperationId extends ApiOperationId> =
    JsonContent<
        WithContent<
            SuccessResponse<
                operations[OperationId] extends { responses: infer Responses }
                ? Responses
                : never
            >
        >
    >
