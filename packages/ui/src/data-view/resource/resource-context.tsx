"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import type { ICrudClient } from "@core/api-client"
import { useTranslations } from "../../lib/i18n"
import { createActionsColumn, type ActionsColumnOptions } from "../../data-view/table-view"
import { useFormDialog } from "../../form/form-dialog"
import { confirm } from "../../components/confirm-dialog"
import { usePermissions } from "../../hooks/use-permissions"
import { RESOURCE_PERMISSIONS } from "../../lib/permissions"
import type { ResourceContext, ResourceItem, UseResourceOptions } from "./types"
import { useResourceQuery } from "./use-resource-query"
import { useResourceMutations } from "./use-resource-mutations"

// Generic React Context needs an erased initial value; narrowed back to
// ResourceContext<TClient> by useResourceContext() below.
// eslint-disable-next-line no-restricted-syntax -- see comment above: erased initial value for a generic context
const resourceContext = createContext(null as unknown)

export function useResourceContext<TClient extends ICrudClient>(): ResourceContext<TClient> {
    const ctx = useContext(resourceContext)
    if (!ctx) {
        throw new Error("useResourceContext must be used within a <ResourceProvider>")
    }
    // Narrows the erased context value back to the caller's concrete TClient; the
    // provider below is the only place that ever sets this context value.
    // eslint-disable-next-line no-restricted-syntax -- see comment above: narrows erased context value to TClient
    return ctx as unknown as ResourceContext<TClient>
}

export type ResourceProviderProps<TClient extends ICrudClient> = UseResourceOptions<TClient> & {
    children: ReactNode
}

export function ResourceProvider<TClient extends ICrudClient>({
    children,
    ...config
}: ResourceProviderProps<TClient>) {
    type TItem = ResourceItem<TClient>

    const queryState = useResourceQuery(config)
    const mutations = useResourceMutations(queryState.client, {
        invalidateQuery: queryState.invalidateQuery,
    })
    const t = useTranslations("system.resource")
    const dialog = useFormDialog(config.paramKey)
    const { can } = usePermissions()
    const permissionSet = RESOURCE_PERMISSIONS[queryState.client.key] ?? {}
    const canCreate = !permissionSet.create || can(permissionSet.create)
    const canUpdate = !permissionSet.update || can(permissionSet.update)
    const canDelete = !permissionSet.delete || can(permissionSet.delete)
    const [selectedItem, setSelectedItem] = useState<TItem | null>(null)
    const [selectedItems, setSelectedItems] = useState<TItem[]>([])
    const clearSelection = () => setSelectedItems([])

    const openEdit = (row: TItem) => {
        setSelectedItem(row)
        dialog.open(String(row.id))
    }

    const openCreate = () => {
        setSelectedItem(null)
        dialog.open()
    }

    const actionsColumn = (
        options?: Partial<ActionsColumnOptions<TItem>>,
    ): ColumnDef<TItem, unknown> =>
        createActionsColumn<TItem>({
            onEdit: canUpdate ? openEdit : undefined,
            onDelete: canDelete
                ? async (row) => {
                    const confirmed = await confirm({
                        title: t("deleteTitle"),
                        description: t("deleteDescription"),
                        confirmLabel: t("deleteConfirm"),
                        variant: "destructive",
                    })
                    if (confirmed) {
                        await mutations.deleteItem(String(row.id))
                    }
                }
                : undefined,
            ...options,
        })

    const value: ResourceContext<TClient> = {
        api: queryState.api,
        client: queryState.client,
        paramKey: config.paramKey,
        list: config.list,
        query: queryState.query,
        data: queryState.data,
        items: queryState.items,
        isLoading: queryState.isLoading,
        isFetching: queryState.isFetching,
        canCreate,
        canUpdate,
        canDelete,
        pagination: queryState.pagination,
        sorting: queryState.sorting,
        params: queryState.params,
        setParams: queryState.setParams,
        filterOptions: queryState.filterOptions,
        handleChange: queryState.handleChange,
        invalidateQuery: queryState.invalidateQuery,
        deleteItem: mutations.deleteItem,
        selectedItem,
        setSelectedItem,
        selectedItems,
        setSelectedItems,
        clearSelection,
        isDialogOpen: dialog.isOpen,
        dialogResourceId: dialog.resourceId,
        openCreate,
        openEdit,
        openDialog: dialog.open,
        closeDialog: dialog.close,
        actionsColumn,
    }

    return (
        // Erases the concrete ResourceContext<TClient> back to the context's declared
        // ResourceContext<ICrudClient> shape; useResourceContext<TClient>() re-narrows it for each consumer.
        // eslint-disable-next-line no-restricted-syntax -- see comment above: erases TClient to the context's declared shape
        <resourceContext.Provider value={value as unknown as ResourceContext<ICrudClient>}>
            {children}
        </resourceContext.Provider>
    )
}