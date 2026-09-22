"use client"

import type { ICrudClient } from "@core/api-client"
import { DataTable } from "../../data-view/table-view"
import type { DataViewProps, RowSelectionState } from "../../data-view/table-view"
import type { ResourceColumns, ResourceItem } from "./types"
import { useResourceContext } from "./resource-context"

export type ResourceTableProps<TClient extends ICrudClient> =
    Partial<Omit<DataViewProps<ResourceItem<TClient>>, "columns" | "data">> & {
        columns: ResourceColumns<TClient>
        enableRowSelection?: boolean
    }

export function ResourceTable<TClient extends ICrudClient>({
    columns: columnsProp,
    enableRowSelection,
    ...dataViewProps
}: ResourceTableProps<TClient>) {
    const resource = useResourceContext<TClient>()

    const columns =
        typeof columnsProp === "function"
            ? columnsProp({
                  actionsColumn: resource.actionsColumn,
                  openEdit: resource.openEdit,
                  deleteItem: resource.deleteItem,
              })
            : columnsProp

    const selectionProps: Partial<DataViewProps<ResourceItem<TClient>>> = enableRowSelection
        ? {
              rowSelection: deriveRowSelection(resource.items, resource.selectedItems),
              onRowSelectionChange: (next: RowSelectionState) => {
                  const currentPageIds = new Set(resource.items.map((i) => String(i.id)))
                  const otherPages = resource.selectedItems.filter(
                      (i) => !currentPageIds.has(String(i.id)),
                  )
                  const nowSelected = resource.items.filter((i) => next[String(i.id)])
                  resource.setSelectedItems([...otherPages, ...nowSelected])
              },
              getRowId: (row: ResourceItem<TClient>) => String(row.id),
          }
        : {}

    return (
        <DataTable
            columns={columns}
            data={resource.items}
            pagination={resource.pagination}
            sorting={resource.sorting}
            onChange={resource.handleChange}
            isLoading={resource.isLoading}
            {...dataViewProps}
            {...selectionProps}
        />
    )
}

function deriveRowSelection<TClient extends ICrudClient>(
    items: ResourceItem<TClient>[],
    selectedItems: ResourceItem<TClient>[],
): RowSelectionState {
    const selectedIds = new Set(selectedItems.map((i) => String(i.id)))
    return Object.fromEntries(items.map((i) => [String(i.id), selectedIds.has(String(i.id))]))
}
