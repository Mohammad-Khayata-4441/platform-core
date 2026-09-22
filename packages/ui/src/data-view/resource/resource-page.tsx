"use client"

import type { ReactNode } from "react"
import type { ICrudClient } from "@core/api-client"
import { ResourceLayout } from "./resource-layout"
import { ResourceListPage, type ResourceListPageProps } from "./resource-list-page"
import type { ResourceRender } from "./types"
import { useResourceContext } from "./resource-context"

type ReactNodeOrRender<TClient extends ICrudClient> = ReactNode | ResourceRender<TClient>

export type ResourcePageProps<TClient extends ICrudClient = ICrudClient> =
    ResourceListPageProps<TClient> & {
        /** Page title */
        title?: string
        /** Optional page description */
        description?: string
        /** Header actions in the page title row (separate from list toolbar actions) */
        headerActions?: ReactNodeOrRender<TClient>
        /** Page padding passed to ResourceLayout */
        padding?: "none" | "sm" | "md" | "lg"
        /** Fullscreen mode */
        fullscreen?: boolean
    }

function useOptionalResourceContext<TClient extends ICrudClient>() {
    try {
        return useResourceContext<TClient>()
    } catch {
        return undefined
    }
}

function resolveNodeOrRender<TClient extends ICrudClient>(
    value: ReactNodeOrRender<TClient> | null | undefined,
    resource: ReturnType<typeof useOptionalResourceContext<TClient>>,
): ReactNode {
    if (!value) return null
    if (typeof value === "function" && resource) {
        return (value as ResourceRender<TClient>)(resource)
    }
    return value as ReactNode
}

export function ResourcePage<TClient extends ICrudClient = ICrudClient>({
    title,
    description,
    headerActions: headerActionsProp,
    padding = "md",
    fullscreen = false,
    toolbar,
    showSearch,
    onSearchChange,
    children,
    ...listPageProps
}: ResourcePageProps<TClient>) {
    const resource = useOptionalResourceContext<TClient>()

    const headerActions = resolveNodeOrRender(headerActionsProp, resource)

    // Custom toolbar (e.g. ResourceSearch + ResourceFilter) replaces the built-in list search bar
    const resolvedShowSearch = showSearch ?? (toolbar ? false : true)
    const resolvedShowFilters = listPageProps.showFilters ?? (toolbar ? false : true)

    const resolvedOnSearchChange =
        onSearchChange ??
        (resource
            ? (value: string) => {
                  resource.handleChange({
                      type: "search",
                      search: value.trim() || null,
                  })
              }
            : undefined)

    return (
        <ResourceLayout
            title={title}
            description={description}
            headerActions={headerActions}
            padding={padding}
            fullscreen={fullscreen}
        >
            <div className="flex min-h-0 flex-1 flex-col">
                <ResourceListPage
                    {...listPageProps}
                    toolbar={toolbar}
                    showSearch={resolvedShowSearch}
                    showFilters={resolvedShowFilters}
                    onSearchChange={resolvedOnSearchChange}
                >
                    {children}
                </ResourceListPage>
            </div>
        </ResourceLayout>
    )
}
