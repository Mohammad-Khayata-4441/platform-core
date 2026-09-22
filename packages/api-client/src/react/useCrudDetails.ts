"use client"

import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import type { ApiError, ICrudClient, CrudShowResponse } from "../infra"
import { crudKeys } from "./crud-keys"

export interface UseCrudDetailsOptions<TClient extends ICrudClient> {
  /** TanStack Query options, minus the keys this hook owns. */
  queryOptions?: Omit<
    UseQueryOptions<CrudShowResponse<TClient>, ApiError>,
    "queryKey" | "queryFn"
  >
}

/**
 * Query hook for a single CRUD resource (getById / show). The query stays
 * disabled until an `id` is provided, so it is safe to call before the id is
 * known (e.g. an edit dialog that has not opened yet).
 */
export function useCrudDetails<TClient extends ICrudClient>(
  client: TClient,
  id: string | null | undefined,
  { queryOptions }: UseCrudDetailsOptions<TClient> = {},
) {
  return useQuery<CrudShowResponse<TClient>, ApiError>({
    queryKey: crudKeys.detail(client.key, id ?? ""),
    queryFn: () => client.show(id as string) as Promise<CrudShowResponse<TClient>>,
    ...queryOptions,
    enabled: Boolean(id) && (queryOptions?.enabled ?? true),
  })
}
