export function unwrapApiData<T>(data: unknown): T {
    if (data && typeof data === "object" && "data" in data) {
        return ((data as { data?: T }).data ?? data) as T
    }
    return data as T
}
