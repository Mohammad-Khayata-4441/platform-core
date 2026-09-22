/**
 * Query-key factory for CRUD resources. Keys are namespaced by the resource
 * `key` so list/detail caches for one resource never collide with another.
 *
 *   crudKeys.all("units")          -> ["units"]
 *   crudKeys.list("units", { q })  -> ["units", "list", { q }]
 *   crudKeys.detail("units", id)   -> ["units", "detail", id]
 *
 * `all` is the broad prefix used for invalidation after a mutation — it
 * matches both list and detail entries for the resource.
 */
export const crudKeys = {
  all: (key: string) => [key] as const,
  lists: (key: string) => [key,] as const,
  list: (key: string, query?: Record<string, unknown>) =>
    [key, "list", query ?? {}] as const,
  details: (key: string) => [key] as const,
  detail: (key: string, id: string) => [key, id] as const,
}
