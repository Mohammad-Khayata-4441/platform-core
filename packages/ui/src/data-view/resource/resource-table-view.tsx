"use client"

import React from "react"
import type { ICrudClient } from "@core/api-client"
import { DataTable } from "../../data-view/table-view"
import type {
    ResourceColumns,
    ResourceContext,
    ResourceDataViewComponent,
    ResourceItem,
} from "./types"

export type ResourceTableViewProps<TClient extends ICrudClient> = {
    resource: ResourceContext<TClient>
    columns: ResourceColumns<TClient>
    view?: ResourceDataViewComponent<ResourceItem<TClient>>
    onRowClick?: (row: ResourceItem<TClient>) => void
}

export function ResourceTableView<TClient extends ICrudClient>({
    resource,
    columns: columnsProp,
    view: View = DataTable,
    onRowClick,
}: ResourceTableViewProps<TClient>) {
    const columns = typeof columnsProp === "function"
        ? columnsProp({
            actionsColumn: resource.actionsColumn,
            openEdit: resource.openEdit,
            deleteItem: resource.deleteItem,
        })
        : columnsProp

    return (
        <View
            columns={columns}
            data={resource.items}
            pagination={resource.pagination}
            sorting={resource.sorting}
            onChange={resource.handleChange}
            isLoading={resource.isLoading}
            onRowClick={onRowClick}
        />
    )
}