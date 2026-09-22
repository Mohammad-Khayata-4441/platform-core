"use client"

import type { ICrudClient, CrudListDataResponse } from "@core/api-client"
import type { UseQueryOptions } from "@tanstack/react-query"
import { useApi } from "@core/api-client/react"
import { useDataViewQuery, type DataViewChangeEvent, type DataViewPaginationState, type DataViewSorting, type DataViewQueryParams } from "../../data-view/table-view"
import { parseFilterOptions } from "../../data-view/table-view/list-query.utils"
import type { ListFilterField } from "@core/api-contracts"
import type { ResourceItem, UseResourceOptions } from "./types"

type ApiInstance = ReturnType<typeof useApi>

export type UseResourceQueryResult<TClient extends ICrudClient> = {
    api: ApiInstance
    client: TClient
    items: ResourceItem<TClient>[]
    isLoading: boolean
    isFetching: boolean
    query: import("@tanstack/react-query").UseQueryResult<CrudListDataResponse<TClient>>
    data: CrudListDataResponse<TClient> | undefined
    pagination: DataViewPaginationState
    sorting: DataViewSorting
    params: DataViewQueryParams
    setParams: (params: Partial<DataViewQueryParams>) => void
    filterOptions: ListFilterField[]
    handleChange: (event: DataViewChangeEvent) => void
    invalidateQuery: () => void
}

export function useResourceQuery<TClient extends ICrudClient>(
    config: UseResourceOptions<TClient>,
): UseResourceQueryResult<TClient> {
    const api = useApi()
    const client = config.getClient(api)

    const queryState = useDataViewQuery({
        queryKey: [client.key],
        client,
        queryOptions: config.queryOptions as Omit<UseQueryOptions<CrudListDataResponse<TClient>>, "queryKey" | "queryFn"> | undefined,
        extraParams: config.extraParams,
        list: config.list ? { searchIn: config.list.searchIn } : undefined,
    })

    const items = Array.from(queryState.data?.data ?? []) as ResourceItem<TClient>[]
    const filterOptions = parseFilterOptions(queryState.data?.meta)

    return {
        api,
        client,
        items,
        filterOptions,
        isLoading: queryState.isLoading,
        isFetching: queryState.isFetching,
        query: queryState.query as import("@tanstack/react-query").UseQueryResult<CrudListDataResponse<TClient>>,
        data: queryState.data as CrudListDataResponse<TClient> | undefined,
        pagination: queryState.pagination,
        sorting: queryState.sorting,
        params: queryState.params,
        setParams: queryState.setParams,
        handleChange: queryState.handleChange,
        invalidateQuery: queryState.invalidateQuery,
    }
}
