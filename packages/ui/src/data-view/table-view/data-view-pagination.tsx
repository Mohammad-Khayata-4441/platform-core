"use client"

import type { Table } from "@tanstack/react-table"
import { ChevronsLeft, ChevronsRight } from "lucide-react"
import { useTranslations } from "../../lib/i18n"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../shadcn/select"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "../../shadcn/pagination"
import { useDataView } from "./data-view-context"

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100]

interface DataViewPaginationProps<TData> {
    table: Table<TData>
}

export function DataViewPagination<TData>({ table }: DataViewPaginationProps<TData>) {
    const tPagination = useTranslations("system.resourcePagination")
    const t = useTranslations("system.dataView")
    const { pagination } = useDataView()

    const canPrevious = table.getCanPreviousPage()
    const canNext = table.getCanNextPage()

    const disabledPrev = !canPrevious ? "pointer-events-none opacity-50" : undefined
    const disabledNext = !canNext ? "pointer-events-none opacity-50" : undefined

    return (
        <div
            data-slot="data-view-pagination"
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
            <p className="text-sm text-muted-foreground">
                {tPagination("summary", {
                    page: pagination.page,
                    pageCount: pagination.pageCount,
                    total: pagination.total,
                })}
            </p>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                        {tPagination("rowsPerPage")}
                    </p>
                    <Select
                        value={String(pagination.pageSize)}
                        onValueChange={(value) => table.setPageSize(Number(value))}
                    >
                        <SelectTrigger size="sm" className="w-17.5 bg-background">
                            <SelectValue placeholder={String(pagination.pageSize)} />
                        </SelectTrigger>
                        <SelectContent side="top">
                            {PAGE_SIZE_OPTIONS.map((size) => (
                                <SelectItem key={size} value={String(size)}>
                                    {size}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Pagination className="mx-0 w-auto">
                    <PaginationContent className="gap-0">
                        <PaginationItem>
                            <PaginationLink
                                size="icon-sm"
                                href="#"
                                aria-label={t("firstPage")}
                                aria-disabled={!canPrevious}
                                className={disabledPrev}
                                onClick={(e) => { e.preventDefault(); table.firstPage() }}
                            >
                                <ChevronsLeft className="size-4 rtl:rotate-180" />
                            </PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationPrevious
                                href="#"
                                text={t("previousPage")}
                                aria-disabled={!canPrevious}
                                className={disabledPrev}
                                onClick={(e) => { e.preventDefault(); table.previousPage() }}
                            />
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationNext
                                href="#"
                                text={t("nextPage")}
                                aria-disabled={!canNext}
                                className={disabledNext}
                                onClick={(e) => { e.preventDefault(); table.nextPage() }}
                            />
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationLink
                                size="icon-sm"
                                href="#"
                                aria-label={t("lastPage")}
                                aria-disabled={!canNext}
                                className={disabledNext}
                                onClick={(e) => { e.preventDefault(); table.lastPage() }}
                            >
                                <ChevronsRight className="size-4 rtl:rotate-180" />
                            </PaginationLink>
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>
        </div>
    )
}
