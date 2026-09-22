"use client"

import { useQueryStates } from "nuqs"
import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query"
import {
    listCrudData,
    type ICrudClient,
    type CrudListDataResponse,
} from "@core/api-client"
import type { DataViewChangeEvent, DataViewPaginationState, DataViewSorting } from "./types"
import { dataViewSearchParams } from "./search-params"
import { toApiListParams, parsePaginationMeta, type ListQueryOptions } from "./list-query.utils"

export type UseDataViewQueryOptions<C extends ICrudClient> = {
    queryKey: string[]
    client: C
    queryOptions?: Omit<UseQueryOptions<CrudListDataResponse<C>>, "queryKey" | "queryFn">
    extraParams?: Record<string, unknown>
    list?: ListQueryOptions
}

export function useDataViewQuery<C extends ICrudClient>({
    queryKey,
    client,
    queryOptions,
    extraParams,
    list,
}: UseDataViewQueryOptions<C>) {
    const [params, setParams] = useQueryStates(dataViewSearchParams)
    const resolvedQueryKey = [...queryKey, params, ...(extraParams ? [extraParams] : [])]

    const query = useQuery<CrudListDataResponse<C>>({
        queryKey: resolvedQueryKey,
        queryFn: () => {
            const apiParams = {
                ...toApiListParams(params, list),
                ...extraParams,
            }
            return listCrudData(client, apiParams)
        },
        ...queryOptions,
    })

    const { pageCount, total } = parsePaginationMeta(query.data?.meta, params.limit)

    const pagination: DataViewPaginationState = {
        page: params.page,
        pageSize: params.limit,
        pageCount,
        total,
    }

    const sorting: DataViewSorting = params.sortField
        ? [{ id: params.sortField, desc: params.sortOrder === "desc" }]
        : []

    const handleChange = (event: DataViewChangeEvent) => {
        switch (event.type) {
            case "pagination":
                setParams({
                    page: event.pagination.page,
                    limit: event.pagination.pageSize,
                })
                break
            case "sorting": {
                const sort = event.sorting[0]
                setParams({
                    sortField: sort?.id ?? null,
                    sortOrder: sort ? (sort.desc ? "desc" : "asc") : null,
                    page: 1,
                })
                break
            }
            case "search":
                setParams({
                    search: event.search,
                    page: 1,
                })
                break
            case "filters":
                setParams({
                    filters: event.filters,
                    page: 1,
                })
                break
        }
    }

    const queryClient = useQueryClient()
    const invalidateQuery = () => {
        queryClient.invalidateQueries({ queryKey })
    }

    return {
        ...query,
        query,
        pagination,
        sorting,
        params,
        setParams,
        handleChange,
        invalidateQuery,
    }
}

export const useDataTableQuery = useDataViewQuery
