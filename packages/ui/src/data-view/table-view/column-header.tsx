"use client"

import type { Column } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown, EyeOff, X } from "lucide-react"
import { useTranslations } from "../../lib/i18n"
import { cn } from "../../lib/cn"
import { Button } from "../../shadcn/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../../shadcn/dropdown-menu"
import { IconTooltip } from "../../components/icon-tooltip"

interface ColumnHeaderProps<TData, TValue> extends React.ComponentProps<"div"> {
    column: Column<TData, TValue>
    title: string
}

export function ColumnHeader<TData, TValue>({
    column,
    title,
    className,
}: ColumnHeaderProps<TData, TValue>) {
    const t = useTranslations("system.dataView")
    const isSortable = column.getCanSort()
    const sorted = column.getIsSorted()

    if (!isSortable) {
        return (
            <span
                data-slot="column-header"
                className={cn("text-xs font-semibold uppercase tracking-wide", className)}
            >
                {title}
            </span>
        )
    }

    const sortLabel =
        sorted === "asc"
            ? t("sortAsc")
            : sorted === "desc"
              ? t("sortDesc")
              : t("sortMenu")

    return (
        <div data-slot="column-header" className={cn("flex items-center", className)}>
            <DropdownMenu>
                <IconTooltip label={sortLabel} side="top">
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "-ms-2 h-8 gap-1.5 px-2 font-semibold uppercase tracking-wide",
                                sorted && "text-primary hover:text-primary",
                            )}
                        >
                            <span>{title}</span>
                            {sorted === "desc" ? (
                                <ArrowDown className="size-3.5 text-primary" />
                            ) : sorted === "asc" ? (
                                <ArrowUp className="size-3.5 text-primary" />
                            ) : (
                                <ArrowUpDown className="size-3.5 text-muted-foreground/70" />
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                </IconTooltip>
                <DropdownMenuContent align="start" className="min-w-36">
                    <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
                        <ArrowUp className="size-3.5 text-muted-foreground" />
                        {t("sortAsc")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
                        <ArrowDown className="size-3.5 text-muted-foreground" />
                        {t("sortDesc")}
                    </DropdownMenuItem>
                    {sorted && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => column.clearSorting()}>
                                <X className="size-3.5 text-muted-foreground" />
                                {t("clearSort")}
                            </DropdownMenuItem>
                        </>
                    )}
                    {column.getCanHide() && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
                                <EyeOff className="size-3.5 text-muted-foreground" />
                                {t("hideColumn")}
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}
