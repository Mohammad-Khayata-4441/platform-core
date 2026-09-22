import type { ApiMeta } from "@core/api-contracts"
import type { ListFilterField } from "@core/api-contracts"
import { appendFiltersToParams } from "../../data-view/filter/filter.utils"
import type { DataViewQueryParams } from "./search-params"

export type ListQueryOptions = {
    searchIn?: string[]
}

export function toApiListParams(
    params: DataViewQueryParams,
    options?: ListQueryOptions,
): Record<string, unknown> {
    const apiParams: Record<string, unknown> = {
        page: params.page,
        limit: params.limit,
    }

    if (params.sortField) apiParams.sortField = params.sortField
    if (params.sortOrder) apiParams.sortOrder = params.sortOrder

    if (params.search) {
        apiParams.search = params.search
        if (options?.searchIn?.length) {
            apiParams.searchIn = options.searchIn.join(",")
        }
    }

    appendFiltersToParams(apiParams, params.filters)

    return apiParams
}

export function parseFilterOptions(meta: unknown): ListFilterField[] {
    const filterOptions = (meta as ApiMeta | undefined)?.filterOptions
    return filterOptions ?? []
}

export function parsePaginationMeta(
    meta: unknown,
    pageSize: number,
): { pageCount: number; total: number } {
    const pagination = (meta as { pagination?: { total?: number; limit?: number } } | undefined)
        ?.pagination

    const total = pagination?.total ?? 0
    const limit = pagination?.limit ?? pageSize
    const pageCount = total > 0 && limit > 0 ? Math.ceil(total / limit) : 1

    return { pageCount, total }
}
