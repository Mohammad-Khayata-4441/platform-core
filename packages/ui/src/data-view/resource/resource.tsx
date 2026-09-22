"use client"

import type { ICrudClient } from "@core/api-client"
import { ResourceProvider } from "./resource-context"
 import { ResourceTable } from "./resource-table"
import { ResourceFormDialog } from "./resource-form-dialog"
import { ResourceCreateButton } from "./resource-create-button"
import { ResourceGrid } from "./resource-grid"
import { ResourcePagination } from "./resource-pagination"
import { ResourceSearch } from "./resource-search"
import { ResourceFilter } from "./resource-filter"
import { ResourceToolbar } from "./resource-toolbar"
import { useResource } from "./use-resource"
import type { ResourceRender, UseResourceOptions } from "./types"
import type { ResourceProviderProps } from "./resource-context"
 import type { ResourceTableProps } from "./resource-table"
import type { ResourceFormDialogProps } from "./resource-form-dialog"
import type { ResourceCreateButtonProps } from "./resource-create-button"
import type { ResourceGridProps } from "./resource-grid"
import { ResourcePage , ResourcePageProps} from "./resource-page"

export type LegacyResourceProps<TClient extends ICrudClient> = UseResourceOptions<TClient> & {
    children?: ResourceRender<TClient>
    render?: ResourceRender<TClient>
}

export function LegacyResource<TClient extends ICrudClient>({
    children,
    render,
    ...options
}: LegacyResourceProps<TClient>) {
    const resource = useResource(options)
    const renderResource = render ?? children

    if (!renderResource) {
        throw new Error("Resource requires a render prop or children function.")
    }

    return <>{renderResource(resource)}</>
}

// ── Compound namespace ──
type ResourceComponent = typeof ResourceProvider & {
    Provider: typeof ResourceProvider
    Page: typeof ResourcePage
    Table: typeof ResourceTable
    FormDialog: typeof ResourceFormDialog
    CreateButton: typeof ResourceCreateButton
    Grid: typeof ResourceGrid
    Pagination: typeof ResourcePagination
    Search: typeof ResourceSearch
    Filter: typeof ResourceFilter
    Toolbar: typeof ResourceToolbar
}

const Resource = ResourceProvider as ResourceComponent

Resource.Provider = ResourceProvider
Resource.Page = ResourcePage
Resource.Table = ResourceTable
Resource.FormDialog = ResourceFormDialog
Resource.CreateButton = ResourceCreateButton
Resource.Grid = ResourceGrid
Resource.Pagination = ResourcePagination
Resource.Search = ResourceSearch
Resource.Filter = ResourceFilter
Resource.Toolbar = ResourceToolbar

export { Resource }

export type {
    ResourceProviderProps as ResourceProps,
    ResourcePageProps,
    ResourceTableProps,
    ResourceFormDialogProps,
    ResourceCreateButtonProps,
    ResourceGridProps,
}
