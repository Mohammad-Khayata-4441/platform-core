// ── Legacy (backward-compatible) ──
export { LegacyResource as Resource, LegacyResource } from "./resource"
export { ResourcePage } from "./resource-page"
export { ResourceTableView } from "./resource-table-view"
export { useResource } from "./use-resource"

// ── Compound Component System ──
export { ResourceProvider, useResourceContext } from "./resource-context"
export { ResourceLayout } from "./resource-layout"
export { ResourceListPage } from "./resource-list-page"
export { ResourceTable } from "./resource-table"
export { ResourceGrid } from "./resource-grid"
export { ResourcePagination } from "./resource-pagination"
export { useResourceQuery } from "./use-resource-query"
export { useResourceMutations } from "./use-resource-mutations"
export { ResourceFormDialog } from "./resource-form-dialog"
export { ResourceCreateButton } from "./resource-create-button"
export { ResourceFilter } from "./resource-filter"
export { ResourceSelectionToolbar } from "./resource-selection-toolbar"
export { Resource as ResourceCompound } from "./resource"
export { generateResource } from "./generate-resource"

// ── Legacy Types ──
export type { LegacyResourceProps } from "./resource"
export type { ResourcePageProps } from "./resource-page"
export type { ResourceTableViewProps } from "./resource-table-view"

// ── Shared Types ──
export type {
    ResourceColumns,
    ResourceContext,
    ResourceContextValue,
    ResourceDataViewComponent,
    ResourceFormProps,
    ResourceItem,
    ResourceProviderConfig,
    ResourceRender,
    ResourceTableHelpers,
    UseResourceOptions,
} from "./types"

// ── Compound Component Types ──
export type { ResourceProviderProps } from "./resource-context"
export type { ResourceLayoutProps } from "./resource-layout"
export type { ResourceListPageProps } from "./resource-list-page"
export type { ResourceTableProps } from "./resource-table"
export type { ResourceGridProps } from "./resource-grid"
export type { UseResourceQueryResult } from "./use-resource-query"
export type { UseResourceMutationsResult } from "./use-resource-mutations"
export type { ResourceFormDialogProps } from "./resource-form-dialog"
export type { ResourceCreateButtonProps } from "./resource-create-button"
export type { ResourceFilterProps } from "./resource-filter"
export type { ResourceSelectionToolbarProps } from "./resource-selection-toolbar"
export type { ResourceNamespace } from "./generate-resource"
