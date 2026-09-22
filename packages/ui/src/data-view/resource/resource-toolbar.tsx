"use client"

import type { ReactNode } from "react"
import { cn } from "../../lib/cn"

export type ResourceToolbarProps = {
    children: ReactNode
    /** Rendered in the end column (e.g. create button). Injected by ResourceListPage from `actions`. */
    actions?: ReactNode
    className?: string
}

export type ResourceToolbarSectionProps = {
    children: ReactNode
    className?: string
}

export function ResourceToolbarStart({
    children,
    className,
}: ResourceToolbarSectionProps) {
    return (
        <div
            data-slot="resource-toolbar-start"
            className={cn("flex items-center gap-2", className)}
        >
            {children}
        </div>
    )
}

export function ResourceToolbarCenter({
    children,
    className,
}: ResourceToolbarSectionProps) {
    return (
        <div
            data-slot="resource-toolbar-center"
            className={cn(
                "flex w-full min-w-0 justify-center px-1 md:px-4",
                className,
            )}
        >
            <div className="w-full max-w-md">{children}</div>
        </div>
    )
}

export function ResourceToolbarEnd({
    children,
    className,
}: ResourceToolbarSectionProps) {
    return (
        <div
            data-slot="resource-toolbar-end"
            className={cn("flex items-center justify-end gap-2", className)}
        >
            {children}
        </div>
    )
}

export function ResourceToolbar({
    children,
    actions,
    className,
}: ResourceToolbarProps) {
    return (
        <div
            data-slot="resource-toolbar"
            className={cn(
                "mb-4 grid w-full grid-cols-1 items-center gap-3 rounded-xl border border-border/80 bg-muted/30 p-3 shadow-sm",
                "md:grid-cols-[auto_minmax(0,1fr)_auto]",
                className,
            )}
        >
            {children}
            {actions ? <ResourceToolbarEnd>{actions}</ResourceToolbarEnd> : null}
        </div>
    )
}

ResourceToolbar.Start = ResourceToolbarStart
ResourceToolbar.Center = ResourceToolbarCenter
ResourceToolbar.End = ResourceToolbarEnd
