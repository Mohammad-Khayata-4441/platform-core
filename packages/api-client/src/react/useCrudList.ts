"use client"

import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import {
  listCrudData,
  type ApiError,
  type ICrudClient,
  type CrudListDataResponse,
} from "../infra"
import { crudKeys } from "./crud-keys"

export interface UseCrudListOptions<TClient extends ICrudClient> {
  /** Query params forwarded to `client.list` (pagination, search, filters, sort). */
  query?: Record<string, unknown>
  /** TanStack Query options, minus the keys this hook owns. */
  queryOptions?: Omit<
    UseQueryOptions<CrudListDataResponse<TClient>, ApiError>,
    "queryKey" | "queryFn"
  >
}

/**
 * Query hook for a CRUD resource list. The cache key is derived from the
 * client's resource key and the query params, so changing params refetches.
 */
export function useCrudList<TClient extends ICrudClient>(
  client: TClient,
  { query, queryOptions }: UseCrudListOptions<TClient> = {},
) {
  return useQuery<CrudListDataResponse<TClient>, ApiError>({
    queryKey: crudKeys.list(client.key, query),
    queryFn: () => listCrudData(client, query),
    ...queryOptions,
  })
}
