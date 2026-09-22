import type { paths } from '@core/api-contracts/types';
import type {
    ApiErrorResponse,
    ApiPath,
    ApiPathByMethod,
    ApiPathParams,
    ApiQueryParams,
    ApiRequestBody,
    ApiResponse,
} from "@core/api-contracts"

import createClient from "openapi-fetch"

type HttpMethod = "get" | "post" | "put" | "delete" | "patch"

export type ApiClientOptions = {
    headers?: Record<string, string>
    locale?: string
}

type ApiRequestOptions<Path extends ApiPath, Method extends HttpMethod> =
    Omit<RequestInit, "method" | "body"> & {
        params?: ApiPathParams<Path, Method> extends never ? never : ApiPathParams<Path, Method>
        query?: ApiQueryParams<Path, Method> extends never ? never : ApiQueryParams<Path, Method>
        body?: ApiRequestBody<Path, Method> extends never ? never : ApiRequestBody<Path, Method>
    }

/** Field name → messages, ready for a form's `setError`. */
export type ValidationErrors = Record<string, string[]>

/**
 * The shared error envelope the API sends, made partial to tolerate
 * transport-level failures that carry only a message.
 */
type ErrorPayload = Partial<ApiErrorResponse>

export class ApiError extends Error {
    public readonly name = "ApiError"

    constructor(
        public readonly status: number,
        public readonly statusText: string,
        public readonly endpoint: string,
        public readonly method: string,
        public readonly payload?: ErrorPayload,
    ) {
        super(payload?.message ?? `${method.toUpperCase()} ${endpoint} failed with ${status} ${statusText}`.trim())
    }

    /** Machine-readable error code from the server, when present. */
    get code(): string | undefined {
        return this.payload?.error?.code
    }

    /**
     * Field-level validation errors mapped from the envelope's
     * `error.details`, grouped by field name.
     */
    get validationErrors(): ValidationErrors | undefined {
        const details = this.payload?.error?.details
        if (!details?.length) return undefined

        const grouped: ValidationErrors = {}
        for (const detail of details) {
            ;(grouped[detail.field] ??= []).push(detail.message)
        }
        return grouped
    }
}

export class ApiClient {
    private client;


    constructor(
        protected baseUrl: string = process.env.NEXT_PUBLIC_API_URL ?? "",
        protected defaultOptions: ApiClientOptions = {},
    ) {
        this.client = createClient<paths>({
            baseUrl: `${this.normalizeBaseUrl(baseUrl)}/`,
            querySerializer(queryParams) {
                const params = new URLSearchParams()

                function serialize(obj: Record<string, unknown>, prefix?: string) {
                    for (const [key, value] of Object.entries(obj)) {
                        const paramKey = prefix ? `${prefix}[${key}]` : key
                        if (Array.isArray(value)) {
                            value.forEach((v) => params.append(paramKey, String(v)))
                        } else if (value !== null && value !== undefined && typeof value === "object") {
                            serialize(value as Record<string, unknown>, paramKey)
                        } else if (value !== null && value !== undefined) {
                            params.append(paramKey, String(value))
                        }
                    }
                }

                serialize(queryParams as Record<string, unknown>)
                return params.toString()
            },
        })
    }

    async request<Path extends ApiPath, Method extends HttpMethod>(
        endpoint: Path,
        method: Method,
        options: ApiRequestOptions<Path, Method> = {} as ApiRequestOptions<Path, Method>,
    ): Promise<ApiResponse<Path, Method>> {
        const ep = endpoint
        const opts = options
        const body = (options as Record<string, unknown>).body

        switch (method) {
            case "get":
                return this.get(ep as never, opts as never) as Promise<ApiResponse<Path, Method>>
            case "post":
                return this.post(ep as never, body, opts as never) as Promise<ApiResponse<Path, Method>>
            case "put":
                return this.put(ep as never, body, opts as never) as Promise<ApiResponse<Path, Method>>
            case "delete":
                return this.delete(ep as never, opts as never) as Promise<ApiResponse<Path, Method>>
            case "patch":
                return this.patch(ep as never, body, opts as never) as Promise<ApiResponse<Path, Method>>
            default:
                throw new ApiError(0, "Unsupported Method", endpoint, method, {
                    message: `Unsupported method: ${String(method)}`,
                })
        }
    }

    async get<Path extends ApiPathByMethod<"get">>(
        endpoint: Path,
        options: ApiRequestOptions<Path, "get"> = {} as ApiRequestOptions<Path, "get">,
    ): Promise<ApiResponse<Path, "get">> {
        const requestOptions = this.toFetchOptions(options)

        try {
            const { data, error, response } = await this.client.GET(endpoint, requestOptions as any)
            return this.resolveResult(endpoint, "get", data, error, response)
        } catch (err) {
            if (err instanceof ApiError) throw err
            throw this.createNetworkError(endpoint, "get")
        }
    }

    async post<Path extends ApiPathByMethod<"post">>(
        endpoint: Path,
        body: ApiRequestBody<Path, "post"> | undefined,
        options: Omit<ApiRequestOptions<Path, "post">, "body"> = {} as Omit<ApiRequestOptions<Path, "post">, "body">,
    ): Promise<ApiResponse<Path, "post">> {
        const requestOptions = this.toFetchOptions({ ...options, body })

        try {
            const { data, error, response } = await this.client.POST(endpoint, requestOptions as any)
            return this.resolveResult(endpoint, "post", data, error, response)
        } catch (err) {
            if (err instanceof ApiError) throw err
            throw this.createNetworkError(endpoint, "post")
        }
    }

    async put<Path extends ApiPathByMethod<"put">>(
        endpoint: Path,
        body: ApiRequestBody<Path, "put">,
        options: Omit<ApiRequestOptions<Path, "put">, "body"> = {} as Omit<ApiRequestOptions<Path, "put">, "body">,
    ): Promise<ApiResponse<Path, "put">> {
        const requestOptions = this.toFetchOptions({ ...options, body })

        try {
            const { data, error, response } = await this.client.PUT(endpoint, requestOptions as any)
            return this.resolveResult(endpoint, "put", data, error, response)
        } catch (err) {
            if (err instanceof ApiError) throw err
            throw this.createNetworkError(endpoint, "put")
        }
    }

    async delete<Path extends ApiPathByMethod<"delete">>(
        endpoint: Path,
        options: ApiRequestOptions<Path, "delete"> = {} as ApiRequestOptions<Path, "delete">,
    ): Promise<ApiResponse<Path, "delete">> {
        const requestOptions = this.toFetchOptions(options)

        try {
            const { data, error, response } = await this.client.DELETE(endpoint, requestOptions as any)
            return this.resolveResult(endpoint, "delete", data, error, response)
        } catch (err) {
            if (err instanceof ApiError) throw err
            throw this.createNetworkError(endpoint, "delete")
        }
    }

    async patch<Path extends ApiPathByMethod<"patch">>(
        endpoint: Path,
        body: ApiRequestBody<Path, "patch">,
        options: Omit<ApiRequestOptions<Path, "patch">, "body"> = {} as Omit<ApiRequestOptions<Path, "patch">, "body">,
    ): Promise<ApiResponse<Path, "patch">> {
        const requestOptions = this.toFetchOptions({ ...options, body })

        try {
            const { data, error, response } = await this.client.PATCH(endpoint, requestOptions as any)
            return this.resolveResult(endpoint, "patch", data, error, response)
        } catch (err) {
            if (err instanceof ApiError) throw err
            throw this.createNetworkError(endpoint, "patch")
        }
    }


    async postFormData(endpoint: string, formData: FormData): Promise<any> {
        const url = `${this.normalizeBaseUrl(this.baseUrl)}${endpoint}`
        const headers = new Headers(this.defaultOptions.headers as Record<string, string>)
        headers.set("Accept", "application/json")
        // Content-Type is intentionally omitted — fetch sets multipart/form-data + boundary automatically

        const response = await fetch(url, { method: "POST", headers, body: formData })
        const text = await response.text()
        const data = text ? JSON.parse(text) : null

        if (!response.ok) {
            throw new ApiError(response.status, response.statusText, endpoint, "post", data)
        }

        return data
    }

    async getBlob(endpoint: string, query?: Record<string, unknown>): Promise<{ blob: Blob; filename: string }> {
        const params = query ? `?${this.serializeQuery(query)}` : ""
        const url = `${this.normalizeBaseUrl(this.baseUrl)}${endpoint}${params}`
        const headers = new Headers(this.defaultOptions.headers as Record<string, string>)
        headers.set("Accept", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/octet-stream")
        if (this.defaultOptions.locale) {
            headers.set("Accept-Language", this.defaultOptions.locale)
        }

        const response = await fetch(url, { method: "GET", headers })
        if (!response.ok) {
            let payload: ErrorPayload | undefined
            try {
                payload = await response.json()
            } catch {
                payload = undefined
            }
            throw new ApiError(response.status, response.statusText, endpoint, "get", payload)
        }

        const blob = await response.blob()
        const disposition = response.headers.get("Content-Disposition") ?? ""
        const filenameMatch = disposition.match(/filename="?([^";\n]+)"?/)
        const filename = filenameMatch?.[1] ?? "download.xlsx"

        return { blob, filename }
    }

    private serializeQuery(queryParams: Record<string, unknown>): string {
        const params = new URLSearchParams()

        function serialize(obj: Record<string, unknown>, prefix?: string) {
            for (const [key, value] of Object.entries(obj)) {
                const paramKey = prefix ? `${prefix}[${key}]` : key
                if (Array.isArray(value)) {
                    value.forEach((v) => params.append(paramKey, String(v)))
                } else if (value !== null && value !== undefined && typeof value === "object") {
                    serialize(value as Record<string, unknown>, paramKey)
                } else if (value !== null && value !== undefined) {
                    params.append(paramKey, String(value))
                }
            }
        }

        serialize(queryParams)
        return params.toString()
    }
    protected normalizeBaseUrl(baseUrl: string): string {
        return baseUrl.replace(/\/+$/, "")
    }

    private toFetchOptions<Path extends ApiPath, Method extends HttpMethod>(
        options: ApiRequestOptions<Path, Method>,
    ): Record<string, unknown> {
        const { params, query, body, headers, ...requestInit } = options as Record<string, unknown>
        const requestOptions: Record<string, unknown> = {
            ...requestInit,
            headers: this.withDefaultHeaders(headers as HeadersInit | undefined),
        }

        if (params || query) {
            requestOptions.params = {
                ...(params ? { path: params } : {}),
                ...(query ? { query } : {}),
            }
        }

        if (body !== undefined) {
            requestOptions.body = body
        }

        return requestOptions
    }

    private withDefaultHeaders(headers?: HeadersInit): Headers {
        const finalHeaders = new Headers(this.defaultOptions.headers)
        finalHeaders.set("Accept", "application/json")
        if (this.defaultOptions.locale) {
            finalHeaders.set("Accept-Language", this.defaultOptions.locale)
        }
        if (headers) {
            new Headers(headers).forEach((value, key) => finalHeaders.set(key, value))
        }
        return finalHeaders
    }

    private resolveResult<Path extends ApiPath, Method extends keyof paths[Path]>(
        endpoint: Path,
        method: Method,
        data: unknown,
        error: unknown,
        response: Response,
    ): ApiResponse<Path, Method> {
        if (error !== undefined) {
            throw new ApiError(
                response.status,
                response.statusText,
                endpoint,
                method as string,
                this.normalizeErrorPayload(error),
            )
        }

        return data as ApiResponse<Path, Method>
    }

    private normalizeErrorPayload(error: unknown): ErrorPayload | undefined {
        if (!error || typeof error !== "object") {
            return undefined
        }

        if ("message" in error || "error" in error) {
            return error as ErrorPayload
        }

        return {
            message: "Request failed",
        }
    }

    private createNetworkError(endpoint: string, method: string): ApiError {
        return new ApiError(
            0,
            "Network Error",
            endpoint,
            method,
            { message: "Network error occurred. Please check your connection and try again." },
        )
    }
}
