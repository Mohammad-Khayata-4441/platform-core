"use client"

import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    type ColumnDef,
    type RowSelectionState,
} from "@tanstack/react-table"
import { Inbox } from "lucide-react"
import { useTranslations } from "../../lib/i18n"
import {
    Table,
    TableHeader,
    TableBody,
    TableFooter,
    TableHead,
    TableRow,
    TableCell,
} from "../../shadcn/table"
import { Skeleton } from "../../shadcn/skeleton"
import { cn } from "../../lib/cn"
import { DataViewProvider } from "./data-view-context"
import type { DataViewProps } from "./types"
import { DataViewPagination } from "./data-view-pagination"

export function DataTable<TData>({
    columns,
    data,
    pagination,
    sorting = [],
    onChange,
    isLoading = false,
    onRowClick,
    slots,
    rowSelection,
    onRowSelectionChange,
    getRowId,
}: DataViewProps<TData>) {
    const t = useTranslations("system.dataView")

    const table = useReactTable({
        data,
        columns: columns as ColumnDef<TData, unknown>[],
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        manualSorting: true,
        pageCount: pagination.pageCount,
        ...(getRowId ? { getRowId } : {}),
        enableRowSelection: rowSelection !== undefined,
        state: {
            sorting,
            pagination: {
                pageIndex: pagination.page - 1,
                pageSize: pagination.pageSize,
            },
            ...(rowSelection !== undefined ? { rowSelection } : {}),
        },
        onSortingChange: (updater) => {
            const next = typeof updater === "function" ? updater(sorting) : updater
            onChange({ type: "sorting", sorting: next })
        },
        onPaginationChange: (updater) => {
            const current = { pageIndex: pagination.page - 1, pageSize: pagination.pageSize }
            const next = typeof updater === "function" ? updater(current) : updater
            onChange({
                type: "pagination",
                pagination: {
                    page: next.pageIndex + 1,
                    pageSize: next.pageSize,
                    pageCount: pagination.pageCount,
                    total: pagination.total,
                },
            })
        },
        ...(onRowSelectionChange
            ? {
                  onRowSelectionChange: (updater) => {
                      const next =
                          typeof updater === "function"
                              ? updater(rowSelection ?? ({} as RowSelectionState))
                              : updater
                      onRowSelectionChange(next)
                  },
              }
            : {}),
    })

    return (
        <DataViewProvider
            pagination={pagination}
            sorting={sorting}
            onChange={onChange}
            isLoading={isLoading}
        >
            <div data-slot="data-view" className="flex flex-col gap-3">
                {slots?.actions && (
                    <div data-slot="data-view-actions">{slots.actions}</div>
                )}

                <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
                    <Table className="w-full">
                        <TableHeader className="bg-muted/40 [&_tr]:border-b [&_tr]:border-border/60">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                                    {headerGroup.headers.map((header) => (
                                        <TableHead
                                            key={header.id}
                                            className="h-11 px-4 text-xs font-semibold tracking-wide uppercase text-muted-foreground"
                                        >
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                      header.column.columnDef.header,
                                                      header.getContext(),
                                                  )}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                            {slots?.extraHeader}
                        </TableHeader>

                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: Math.min(pagination.pageSize, 8) }).map(
                                    (_, i) => (
                                        <TableRow key={`skeleton-${i}`} className="hover:bg-transparent">
                                            {columns.map((_, j) => (
                                                <TableCell key={`skeleton-${i}-${j}`} className="px-4 py-3">
                                                    <Skeleton className="h-5 w-full max-w-48 rounded-md" />
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ),
                                )
                            ) : table.getRowModel().rows.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                        className={cn(
                                            "group/table-row border-border/50 transition-colors",
                                            "hover:bg-muted/35 data-[state=selected]:bg-primary/5",
                                            onRowClick && "cursor-pointer",
                                        )}
                                        onClick={() => onRowClick?.(row.original)}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell
                                                key={cell.id}
                                                className="px-4 py-3 text-sm text-foreground"
                                            >
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext(),
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-40 px-4 py-8"
                                    >
                                        <div className="flex flex-col items-center justify-center gap-2 text-center">
                                            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                                                <Inbox className="size-5 text-muted-foreground" />
                                            </div>
                                            <p className="text-sm font-medium text-foreground">
                                                {t("empty")}
                                            </p>
                                            <p className="max-w-sm text-sm text-muted-foreground">
                                                {t("emptyDescription")}
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            {slots?.extraBody}
                        </TableBody>

                        {slots?.footer && (
                            <TableFooter>{slots.footer}</TableFooter>
                        )}
                    </Table>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
                    <DataViewPagination table={table} />
                </div>
            </div>
        </DataViewProvider>
    )
}
