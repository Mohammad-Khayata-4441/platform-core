"use client"

import type { ReactNode } from "react"
import { cn } from "../../lib/cn"

export type ResourceLayoutProps = {
    /** Page title */
    title?: string
    /** Optional page description */
    description?: string
    /** Optional header actions (e.g. create button in page header) */
    headerActions?: ReactNode
    /** Main content area */
    children: ReactNode
    /** Page padding */
    padding?: "none" | "sm" | "md" | "lg"
    /** Full screen mode */
    fullscreen?: boolean
    /** Custom className for main container */
    className?: string
}

type ResourcePageHeaderProps = {
    title?: string
    description?: string
    headerActions?: ReactNode
}

function ResourcePageHeader({
    title,
    description,
    headerActions,
}: ResourcePageHeaderProps) {
    return (
        <header className="mb-4 flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
                {title && (
                    <span
                        aria-hidden
                        className="mt-1.5 hidden h-8 w-1 shrink-0 rounded-full bg-primary shadow-[0_0_10px_-2px] shadow-primary/60 sm:block"
                    />
                )}
                <div className="min-w-0">
                    {title && (
                        <h1 className="text-xl font-semibold leading-tight tracking-tight text-foreground sm:text-2xl">
                            {title}
                        </h1>
                    )}
                    {description && (
                        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                            {description}
                        </p>
                    )}
                </div>
            </div>
            {headerActions && (
                <div className="shrink-0">{headerActions}</div>
            )}
        </header>
    )
}

export function ResourceLayout({
    title,
    description,
    headerActions,
    children,
    padding = "md",
    fullscreen = false,
    className,
}: ResourceLayoutProps) {
    const paddingClass = {
        none: "",
        sm: "p-2",
        md: "p-4",
        lg: "p-6",
    }[padding]

    const showHeader = Boolean(title || description || headerActions)

    return (
        <div className={cn("page", fullscreen && "h-screen", className)}>
            <main
                className={cn(
                    "flex h-full w-full flex-col",
                    paddingClass,
                    fullscreen && "p-0 lg:p-0",
                )}
            >
                {showHeader && (
                    <ResourcePageHeader
                        title={title}
                        description={description}
                        headerActions={headerActions}
                    />
                )}

                <div className="min-h-0 flex-1 overflow-auto">{children}</div>
            </main>
        </div>
    )
}

export { ResourcePageHeader }
