"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "../../shadcn/checkbox"

export function createSelectionColumn<TData>(): ColumnDef<TData, unknown> {
    return {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={
                    table.getIsAllPageRowsSelected()
                        ? true
                        : table.getIsSomePageRowsSelected()
                          ? "indeterminate"
                          : false
                }
                onCheckedChange={(v) => table.toggleAllPageRowsSelected(v === true)}
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(checked) => row.toggleSelected(checked === true)}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        size: 40,
    }
}
