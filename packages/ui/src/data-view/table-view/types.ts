import type { ColumnDef, RowSelectionState, SortingState } from "@tanstack/react-table"
export type { RowSelectionState }
import type { ReactNode } from "react"

export type DataViewPaginationState = {
    page: number
    pageSize: number
    pageCount: number
    total: number
}

export type DataViewSorting = SortingState

export type DataViewState = {
    pagination: DataViewPaginationState
    sorting: DataViewSorting
}

import type { ParsedFilters } from "@core/api-contracts"

export type DataViewChangeEvent =
    | { type: "pagination"; pagination: DataViewPaginationState }
    | { type: "sorting"; sorting: DataViewSorting }
    | { type: "search"; search: string | null }
    | { type: "filters"; filters: ParsedFilters | null }

export type DataViewSlots = {
    actions?: ReactNode
    extraHeader?: ReactNode
    extraBody?: ReactNode
    footer?: ReactNode
}

export type DataViewProps<TData> = {
    columns: ColumnDef<TData, unknown>[]
    data: TData[]
    pagination: DataViewPaginationState
    sorting?: DataViewSorting
    onChange: (event: DataViewChangeEvent) => void
    isLoading?: boolean
    onRowClick?: (row: TData) => void
    slots?: DataViewSlots
    rowSelection?: RowSelectionState
    onRowSelectionChange?: (next: RowSelectionState) => void
    getRowId?: (row: TData, index: number) => string
}
