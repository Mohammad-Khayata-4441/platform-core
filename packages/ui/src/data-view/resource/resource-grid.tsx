"use client"

import type { ReactNode } from "react"
import { Skeleton } from "../../shadcn/skeleton"
import { Card, CardContent, CardHeader } from "../../shadcn/card"
import { useResourceContext } from "./resource-context"
import { ResourcePagination } from "./resource-pagination"

export type ResourceGridProps<TItem extends { id: string }> = {
    children: (item: TItem, index: number) => ReactNode
    loadingRowCount?: number
    emptyMessage?: string
    gridClassName?: string
    keyExtractor?: (item: TItem) => string
    showPagination?: boolean
}

export function ResourceGrid<TItem extends { id: string }>({
    children: renderItem,
    loadingRowCount = 6,
    emptyMessage = "No items found.",
    gridClassName = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
    keyExtractor = (item) => String(item.id),
    showPagination = true,
}: ResourceGridProps<TItem>) {
    const resource = useResourceContext()
    const items = resource.items as TItem[]

    if (resource.isLoading) {
        return (
            <div className="flex flex-col gap-4">
                <div className={gridClassName}>
                    {Array.from({ length: loadingRowCount }).map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader className="gap-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </CardHeader>
                            <CardContent className="gap-2">
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-2/3" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
                {showPagination && <ResourcePagination />}
            </div>
        )
    }

    if (!items.length) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                {emptyMessage}
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            <div className={gridClassName}>
                {items.map((item, index) => (
                    <div key={keyExtractor(item)}>
                        {renderItem(item, index)}
                    </div>
                ))}
            </div>
            {showPagination && <ResourcePagination />}
        </div>
    )
}