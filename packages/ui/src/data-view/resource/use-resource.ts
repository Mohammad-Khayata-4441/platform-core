"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "../../lib/i18n"
import { confirm } from "../../components/confirm-dialog"
import { useApi } from "@core/api-client/react"
import { useFormDialog } from "../../form/form-dialog"
import {
    createActionsColumn,
    useDataViewQuery,
    parseFilterOptions,
    type ActionsColumnOptions,
} from "../../data-view/table-view"
import type { ColumnDef } from "@tanstack/react-table"
import type { ICrudClient } from "@core/api-client"
import { toastErrorMessage } from "../../lib/cn"
import { usePermissions } from "../../hooks/use-permissions"
import { RESOURCE_PERMISSIONS } from "../../lib/permissions"
import type {
    ResourceContext,
    ResourceItem,
    UseResourceOptions,
} from "./types"

export function useResource<TClient extends ICrudClient>({
    getClient,
    queryOptions,
    paramKey,
    extraParams,
    list,
}: UseResourceOptions<TClient>): ResourceContext<TClient> {
    type TItem = ResourceItem<TClient>

    const api = useApi()
    const t = useTranslations("system.resource")
    const client = getClient(api)
    const { can } = usePermissions()
    const permissionSet = RESOURCE_PERMISSIONS[client.key] ?? {}
    const canCreate = !permissionSet.create || can(permissionSet.create)
    const canUpdate = !permissionSet.update || can(permissionSet.update)
    const canDelete = !permissionSet.delete || can(permissionSet.delete)
    const { open: openDialog, close: closeDialog, isOpen, resourceId } = useFormDialog(paramKey)
    const [selectedItem, setSelectedItem] = useState<TItem | null>(null)
    const [selectedItems, setSelectedItems] = useState<TItem[]>([])
    const clearSelection = () => setSelectedItems([])

    const query = useDataViewQuery({
        queryKey: [client.key],
        client,
        queryOptions,
        extraParams,
        list: list ? { searchIn: list.searchIn } : undefined,
    })

    const data = query.data
    const items = Array.from(data?.data ?? [])
    const filterOptions = parseFilterOptions(data?.meta)

    const { mutateAsync: deleteItem } = useMutation({
        mutationFn: (id: string) => {
            const promise = client.destroy(id)
            toast.promise(promise, {
                loading: t("toastDeleting"),
                success: t("toastDeleted"),
                error: (err: unknown) => toastErrorMessage(err, t("toastDeleteFailed")),
            })
            return promise
        },
        onSuccess: () => query.invalidateQuery(),
    })

    const openEdit = (row: TItem) => {
        setSelectedItem(row)
        openDialog(String(row.id))
    }

    const openCreate = () => {
        setSelectedItem(null)
        openDialog()
    }

    const buildActionsColumn = (
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
                        await deleteItem(String(row.id))
                    }
                }
                : undefined,
            ...options,
        })

    return {
        api,
        client,
        paramKey,
        list,
        query: query.query,
        data,
        items,
        selectedItem,
        setSelectedItem,
        selectedItems,
        setSelectedItems,
        clearSelection,
        isDialogOpen: isOpen,
        dialogResourceId: resourceId,
        canCreate,
        canUpdate,
        canDelete,
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        pagination: query.pagination,
        sorting: query.sorting,
        params: query.params,
        setParams: query.setParams,
        filterOptions,
        handleChange: query.handleChange,
        openCreate,
        openEdit,
        openDialog,
        closeDialog,
        deleteItem,
        invalidateQuery: query.invalidateQuery,
        actionsColumn: buildActionsColumn,
    }
}
