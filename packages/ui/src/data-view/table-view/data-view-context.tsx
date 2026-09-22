"use client"

import { createContext, useContext } from "react"
import type { DataViewChangeEvent, DataViewPaginationState, DataViewSorting } from "./types"

type DataViewContextValue = {
    pagination: DataViewPaginationState
    sorting: DataViewSorting
    onChange: (event: DataViewChangeEvent) => void
    isLoading: boolean
}

const DataViewContext = createContext<DataViewContextValue | null>(null)

export function DataViewProvider({
    children,
    ...value
}: DataViewContextValue & { children: React.ReactNode }) {
    return (
        <DataViewContext.Provider value={value}>
            {children}
        </DataViewContext.Provider>
    )
}

export function useDataView() {
    const ctx = useContext(DataViewContext)
    if (!ctx) throw new Error("useDataView must be used within a DataViewProvider")
    return ctx
}
