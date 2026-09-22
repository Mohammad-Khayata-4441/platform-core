import { afterEach, describe, expect, it, vi } from "vitest"
import type { ApiErrorResponse } from "@core/api-contracts"
import { ApiClient, ApiError } from "./client"

/**
 * The exact body the API produces for a failed request-body validation:
 * the shared envelope, with the field-level details nested under `error`.
 * Pinned to `ApiErrorResponse` so the server and this client test cannot drift.
 */
const SERVER_VALIDATION_ERROR = {
    status: "error",
    message: "Validation failed",
    data: null,
    error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: [
            { field: "name", message: "name must be an object", code: "isObject" },
            { field: "abbreviation", message: "abbreviation should not be empty", code: "isNotEmpty" },
        ],
    },
} satisfies ApiErrorResponse

function clientWithResponse(body: unknown, status: number) {
    vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
            new Response(JSON.stringify(body), {
                status,
                headers: { "Content-Type": "application/json" },
            }),
        ),
    )
    return new ApiClient("http://localhost")
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
})

describe("ApiClient — server validation errors on the wire", () => {
    it("surfaces field-level details through ApiError.validationErrors", async () => {
        const client = clientWithResponse(SERVER_VALIDATION_ERROR, 422)

        const error = await client
            .post("/units", { name: { ar: "" }, abbreviation: "" })
            .then(() => undefined)
            .catch((err: unknown) => err)

        expect(error).toBeInstanceOf(ApiError)
        const apiError = error as ApiError
        expect(apiError.code).toBe("VALIDATION_ERROR")
        expect(apiError.validationErrors).toEqual({
            name: ["name must be an object"],
            abbreviation: ["abbreviation should not be empty"],
        })
    })

    it("returns undefined validationErrors for non-validation errors", async () => {
        const client = clientWithResponse(
            {
                status: "error",
                message: "Not found",
                data: null,
                error: { code: "NOT_FOUND", message: "Unit not found" },
            } satisfies ApiErrorResponse,
            404,
        )

        const error = (await client
            .get("/units/{id}", { params: { id: "missing" } })
            .catch((err: unknown) => err)) as ApiError

        expect(error).toBeInstanceOf(ApiError)
        expect(error.validationErrors).toBeUndefined()
    })
})
