"use client"

import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query"
import type { ApiError, ICrudClient } from "../infra"
import { crudKeys } from "./crud-keys"

// ── Inferred request/response shapes from the concrete client ──
type CreateBody<T extends ICrudClient> = Parameters<T["create"]>[0]
type CreateResponse<T extends ICrudClient> = Awaited<ReturnType<T["create"]>>

type UpdateBody<T extends ICrudClient> = Parameters<T["update"]>[1]
type UpdateResponse<T extends ICrudClient> = Awaited<ReturnType<T["update"]>>
export type CrudUpdateVariables<T extends ICrudClient> = {
  id: string
  body: UpdateBody<T>
}

type DeleteResponse<T extends ICrudClient> = Awaited<ReturnType<T["destroy"]>>

/** Mutation options, minus `mutationFn` which each hook supplies. */
type CrudMutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData, ApiError, TVariables>,
  "mutationFn"
>

/**
 * After a successful mutation we invalidate every query for the resource
 * (`[client.key, ...]`), refreshing both lists and details. The caller's own
 * `onSuccess` still runs afterwards.
 */
function withInvalidation<TData, TVariables>(
  client: ICrudClient,
  queryClient: ReturnType<typeof useQueryClient>,
  options?: CrudMutationOptions<TData, TVariables>,
): Pick<UseMutationOptions<TData, ApiError, TVariables>, "onSuccess"> {
  const onSuccess: NonNullable<
    UseMutationOptions<TData, ApiError, TVariables>["onSuccess"]
  > = (...args) => {
    queryClient.invalidateQueries({ queryKey: crudKeys.all(client.key) })
    return options?.onSuccess?.(...args)
  }
  return { onSuccess }
}

/** Mutation hook for creating a resource. */
export function useCrudCreate<TClient extends ICrudClient>(
  client: TClient,
  options?: CrudMutationOptions<CreateResponse<TClient>, CreateBody<TClient>>,
) {
  const queryClient = useQueryClient()
  return useMutation<CreateResponse<TClient>, ApiError, CreateBody<TClient>>({
    mutationFn: (body) =>
      client.create(body) as Promise<CreateResponse<TClient>>,
    ...options,
    ...withInvalidation(client, queryClient, options),
  })
}

/** Mutation hook for updating a resource by id. */
export function useCrudUpdate<TClient extends ICrudClient>(
  client: TClient,
  options?: CrudMutationOptions<UpdateResponse<TClient>, CrudUpdateVariables<TClient>>,
) {
  const queryClient = useQueryClient()
  return useMutation<UpdateResponse<TClient>, ApiError, CrudUpdateVariables<TClient>>({
    mutationFn: ({ id, body }) =>
      client.update(id, body) as Promise<UpdateResponse<TClient>>,
    ...options,
    ...withInvalidation(client, queryClient, options),
  })
}

/** Mutation hook for deleting a resource by id. */
export function useCrudDelete<TClient extends ICrudClient>(
  client: TClient,
  options?: CrudMutationOptions<DeleteResponse<TClient>, string>,
) {
  const queryClient = useQueryClient()
  return useMutation<DeleteResponse<TClient>, ApiError, string>({
    mutationFn: (id) =>
      client.destroy(id) as Promise<DeleteResponse<TClient>>,
    ...options,
    ...withInvalidation(client, queryClient, options),
  })
}
