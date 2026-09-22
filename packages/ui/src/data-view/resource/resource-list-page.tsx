"use client"

import { ReactNode, isValidElement, cloneElement } from "react"
import type { ICrudClient } from "@core/api-client"
import { useLocale, useTranslations } from "../../lib/i18n"
import { cn } from "../../lib/cn"
import { Button } from "../../shadcn/button"
import { Input } from "../../shadcn/input"
import { SlidersHorizontalIcon, SearchIcon, DownloadIcon } from "lucide-react"
import { useResourceContext } from "./resource-context"
import { ResourceFilter } from "./resource-filter"
import type { ResourceRender } from "./types"

type ReactNodeOrRender<TClient extends ICrudClient> = ReactNode | ResourceRender<TClient>

export type ResourceListPageProps<TClient extends ICrudClient = ICrudClient> = {
  /** Main content area (table, grid, etc.) */
  children: ReactNode
  /** Search bar placeholder text */
  searchPlaceholder?: string
  /** Search input value handler */
  onSearchChange?: (value: string) => void
  /** Show search bar */
  showSearch?: boolean
  /** Show filters toggle button */
  showFilters?: boolean
  /** Filters button click handler */
  onFiltersClick?: () => void
  /** Show export button */
  showExport?: boolean
  /** Export button click handler */
  onExport?: () => void
  /** Custom toolbar actions (create button, print, etc.) - supports function for resource context */
  toolbar?: ReactNodeOrRender<TClient>
  /** Custom actions slot - supports function for resource context */
  actions?: ReactNodeOrRender<TClient>
}

export function ResourceListPage<TClient extends ICrudClient = ICrudClient>({
  children,
  searchPlaceholder,
  onSearchChange,
  showSearch = true,
  showFilters = true,
  onFiltersClick,
  showExport = false,
  onExport,
  toolbar,
  actions,
}: ResourceListPageProps<TClient>) {
  const locale = useLocale()
  const tSearch = useTranslations("system.resourceSearch")
  const tFilter = useTranslations("system.resourceFilter")
  const isRtl = locale === "ar"

  const resource = useResourceContext<TClient>()

  const resolveNodeOrRender = (
    value: ReactNodeOrRender<TClient> | null | undefined
  ): ReactNode => {
    if (!value) return null
    if (typeof value === "function" && resource) {
      return value(resource) as ReactNode
    }
    return value as ReactNode
  }

  const resolvedToolbar = resolveNodeOrRender(toolbar)
  const resolvedActions = resolveNodeOrRender(actions)

  const toolbarWithActions =
    resolvedToolbar && resolvedActions
      ? isValidElement(resolvedToolbar)
        ? cloneElement(
              resolvedToolbar as React.ReactElement<{ actions?: ReactNode }>,
              { actions: resolvedActions },
          )
        : resolvedToolbar
      : resolvedToolbar

  const hasLegacyOperations =
    !resolvedToolbar && (showSearch || showFilters || showExport || resolvedActions)

  const filterControl = onFiltersClick ? (
    <Button
      variant="outline"
      size="sm"
      onClick={onFiltersClick}
      className="h-10 bg-background"
    >
      <SlidersHorizontalIcon className="size-4 me-2" />
      {tFilter("button")}
    </Button>
  ) : (
    <ResourceFilter className="h-10 bg-background" />
  )

  return (
    <>
      {toolbarWithActions}

      {hasLegacyOperations && (
        <div
          className={cn(
            "mb-4 grid grid-cols-3 gap-3 rounded-xl border border-border/80 bg-muted/30 p-3 shadow-sm",
            "md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center",
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2",
              isRtl ? "flex-row-reverse" : "flex-row",
            )}
          >
            {showFilters && filterControl}
          </div>

          {showSearch && (
            <div className="flex col-span-3 order-3 md:col-span-1 md:order-2 w-full min-w-0 justify-center px-1 md:px-4">
              <div className="group relative w-full max-w-md">
                <SearchIcon
                  aria-hidden
                  className={cn(
                    "absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary",
                    isRtl ? "inset-e-3" : "inset-s-3",
                  )}
                />
                <Input
                  type="text"
                  placeholder={searchPlaceholder ?? tSearch("placeholder")}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className={cn(
                    "h-10 border-border/80 bg-background shadow-sm",
                    "focus-visible:border-primary/40 focus-visible:ring-primary/15",
                    isRtl ? "pe-10 ps-3" : "ps-10 pe-3",
                  )}
                />
              </div>
            </div>
          )}

          <div
            className={cn(
              "flex items-center justify-end gap-2 order-2 md:order-3",
              isRtl ? "flex-row-reverse" : "flex-row",
            )}
          >
            {showExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                className="h-10 bg-background"
              >
                <DownloadIcon className="size-4 me-2" />
                Export
              </Button>
            )}

            {resolvedActions && resolvedActions}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">{children}</div>
    </>
  )
}
