"use client"

import {
    parseAsInteger,
    parseAsString,
    parseAsStringEnum,
    createSearchParamsCache,
    type inferParserType,
} from "nuqs/server"
import { parseAsFilters } from "../../data-view/filter/filter-parsers"

export const dataTableSearchParams = {
    page: parseAsInteger.withDefault(1),
    limit: parseAsInteger.withDefault(20),
    sortField: parseAsString,
    sortOrder: parseAsStringEnum(["asc", "desc"] as string[]),
    search: parseAsString,
    filters: parseAsFilters,
}

export const dataViewSearchParams = dataTableSearchParams

export type DataTableSearchParams = typeof dataTableSearchParams
export type DataViewSearchParams = typeof dataViewSearchParams
export type DataTableQueryParams = inferParserType<typeof dataTableSearchParams>
export type DataViewQueryParams = inferParserType<typeof dataViewSearchParams>

export const dataTableSearchParamsCache = createSearchParamsCache(dataTableSearchParams)
export const dataViewSearchParamsCache = dataTableSearchParamsCache
