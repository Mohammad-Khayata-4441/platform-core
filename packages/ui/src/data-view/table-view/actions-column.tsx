"use client"

import type { ColumnDef, Row } from "@tanstack/react-table"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { useTranslations } from "../../lib/i18n"
import { Button } from "../../shadcn/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../../shadcn/dropdown-menu"
import { IconTooltip } from "../../components/icon-tooltip"
import { cn } from "../../lib/cn"

export type ActionsColumnOptions<TData> = {
    onEdit?: (row: TData) => void
    onDelete?: (row: TData) => Promise<unknown>
}

export function createActionsColumn<TData extends { id: string | number }>(
    options: ActionsColumnOptions<TData>,
): ColumnDef<TData, unknown> {
    return {
        id: "actions",
        header: () => <ActionsHeader />,
        cell: ({ row }) => <ActionsCell row={row} options={options} />,
        enableSorting: false,
        enableHiding: false,
    }
}

function ActionsHeader() {
    const t = useTranslations("system.tableActions")
    return <span className="sr-only">{t("header")}</span>
}

function ActionsCell<TData extends { id: string | number }>({
    row,
    options,
}: {
    row: Row<TData>
    options: ActionsColumnOptions<TData>
}) {
    const t = useTranslations("system.tableActions")

    return (
        <div className="flex justify-end">
            <DropdownMenu>
                <IconTooltip label={t("openMenu")} side="left">
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            className={cn(
                                "text-muted-foreground opacity-0 transition-opacity",
                                "group-hover/table-row:opacity-100 focus-visible:opacity-100",
                                "data-[state=open]:opacity-100 hover:bg-muted hover:text-foreground",
                            )}
                        >
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">{t("openMenu")}</span>
                        </Button>
                    </DropdownMenuTrigger>
                </IconTooltip>
                <DropdownMenuContent align="end" className="min-w-36">
                    {options.onEdit && (
                        <DropdownMenuItem onClick={() => options.onEdit!(row.original)}>
                            <Pencil className="size-3.5 text-muted-foreground" />
                            {t("edit")}
                        </DropdownMenuItem>
                    )}
                    {options.onDelete && (
                        <DropdownMenuItem
                            variant="destructive"
                            onClick={() => options.onDelete!(row.original)}
                        >
                            <Trash2 className="size-3.5" />
                            {t("delete")}
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}
