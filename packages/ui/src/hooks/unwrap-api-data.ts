/**
 * Unwraps a resource payload that may be wrapped in an API envelope (`{ data }`)
 * or passed through as the bare entity. Used by `mapToFormValues` implementations
 * so each config doesn't re-inline the same `"data" in data` cast.
 */
export function unwrapApiData<T>(data: unknown): Partial<T> {
    if (data && typeof data === "object" && "data" in data) {
        return ((data as { data?: Partial<T> }).data ?? {}) as Partial<T>
    }
    return (data ?? {}) as Partial<T>
}
