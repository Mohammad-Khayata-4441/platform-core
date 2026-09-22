import type { ComponentType, Dispatch, ReactNode, SetStateAction } from "react"
import type { UseQueryOptions, UseQueryResult } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import type {
    ICrudClient,
    CrudListDataResponse,
    CrudListDataItem,
} from "@core/api-client"
import type {
    ActionsColumnOptions,
    DataViewChangeEvent,
    DataViewPaginationState,
    DataViewQueryParams,
    DataViewProps,
    DataViewSorting,
} from "../../data-view/table-view"
import type { ListFilterField } from "@core/api-contracts"
import type { useApi } from "@core/api-client/react"

type ApiInstance = ReturnType<typeof useApi>

export type ResourceListConfig = {
    searchIn?: string[]
    defaultSort?: { field: string; order: "asc" | "desc" }
    pageSize?: number
}

export type ResourceItem<TClient extends ICrudClient> = CrudListDataItem<TClient>

export type UseResourceOptions<TClient extends ICrudClient> = {
    getClient: (api: ApiInstance) => TClient
    queryOptions?: Omit<UseQueryOptions<CrudListDataResponse<TClient>>, "queryKey" | "queryFn">
    paramKey?: string
    extraParams?: Record<string, unknown>
    list?: ResourceListConfig
}

export type ResourceTableHelpers<TClient extends ICrudClient> = {
    actionsColumn: (
        options?: Partial<ActionsColumnOptions<ResourceItem<TClient>>>,
    ) => ColumnDef<ResourceItem<TClient>, unknown>
    openEdit: (row: ResourceItem<TClient>) => void
    deleteItem: (id: string) => Promise<unknown>
}

export type ResourceContext<TClient extends ICrudClient> = ResourceTableHelpers<TClient> & {
    api: ApiInstance
    client: TClient
    paramKey?: string
    list?: ResourceListConfig
    query: UseQueryResult<CrudListDataResponse<TClient>>
    data: CrudListDataResponse<TClient> | undefined
    items: ResourceItem<TClient>[]
    selectedItem: ResourceItem<TClient> | null
    setSelectedItem: Dispatch<SetStateAction<ResourceItem<TClient> | null>>
    selectedItems: ResourceItem<TClient>[]
    setSelectedItems: Dispatch<SetStateAction<ResourceItem<TClient>[]>>
    clearSelection: () => void
    isDialogOpen: boolean
    dialogResourceId: string | null
    isLoading: boolean
    isFetching: boolean
    /** Cosmetic gates derived from `RESOURCE_PERMISSIONS[client.key]`; the API enforces. */
    canCreate: boolean
    canUpdate: boolean
    canDelete: boolean
    pagination: DataViewPaginationState
    sorting: DataViewSorting
    params: DataViewQueryParams
    setParams: (params: Partial<DataViewQueryParams>) => void
    filterOptions: ListFilterField[]
    handleChange: (event: DataViewChangeEvent) => void
    openCreate: () => void
    openDialog: (resourceId?: string) => void
    closeDialog: () => void
    invalidateQuery: () => void
}

export type ResourceColumns<TClient extends ICrudClient> =
    | ColumnDef<ResourceItem<TClient>>[]
    | ((helpers: ResourceTableHelpers<TClient>) => ColumnDef<ResourceItem<TClient>>[])

export type ResourceRender<TClient extends ICrudClient> = (
    resource: ResourceContext<TClient>,
) => ReactNode

export type ResourceDataViewComponent<TData> = ComponentType<DataViewProps<TData>>

export type ResourceFormProps<TClient extends ICrudClient> = {
    resourceId: string | null
    initialData: ResourceItem<TClient> | null
    onSuccess: () => void
    paramKey?: string
}

export type ResourceContextValue<TClient extends ICrudClient> = ResourceContext<TClient>

export type ResourceProviderConfig<TClient extends ICrudClient> = UseResourceOptions<TClient>
