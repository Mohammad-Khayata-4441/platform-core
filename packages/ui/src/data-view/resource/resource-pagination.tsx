"use client"

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
import { useResourceContext } from "./resource-context"

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100]

export function ResourcePagination() {
    const t = useTranslations("system.resourcePagination")
    const tDataView = useTranslations("system.dataView")
    const { pagination, handleChange } = useResourceContext()
    const { page, pageSize, pageCount, total } = pagination

    const canPrevious = page > 1
    const canNext = page < pageCount

    const goToPage = (p: number) => {
        handleChange({
            type: "pagination",
            pagination: { page: p, pageSize, pageCount, total },
        })
    }

    const changePageSize = (size: number) => {
        handleChange({
            type: "pagination",
            pagination: { page: 1, pageSize: size, pageCount, total },
        })
    }

    const disabledPrev = !canPrevious ? "pointer-events-none opacity-50" : undefined
    const disabledNext = !canNext ? "pointer-events-none opacity-50" : undefined

    return (
        <div data-slot="resource-pagination" className="flex items-center justify-between px-2">
            <div className="text-sm text-muted-foreground">
                {t("summary", { page, pageCount, total })}
            </div>
            <div className="flex items-center gap-6 lg:gap-8">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{t("rowsPerPage")}</p>
                    <Select
                        value={String(pageSize)}
                        onValueChange={(value) => changePageSize(Number(value))}
                    >
                        <SelectTrigger size="sm" className="w-17.5">
                            <SelectValue placeholder={String(pageSize)} />
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
                                aria-label={tDataView("firstPage")}
                                aria-disabled={!canPrevious}
                                className={disabledPrev}
                                onClick={(e) => { e.preventDefault(); goToPage(1) }}
                            >
                                <ChevronsLeft className="size-4 rtl:rotate-180" />
                            </PaginationLink>
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationPrevious
                                href="#"
                                text={tDataView("previousPage")}
                                aria-disabled={!canPrevious}
                                className={disabledPrev}
                                onClick={(e) => { e.preventDefault(); goToPage(page - 1) }}
                            />
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationNext
                                href="#"
                                text={tDataView("nextPage")}
                                aria-disabled={!canNext}
                                className={disabledNext}
                                onClick={(e) => { e.preventDefault(); goToPage(page + 1) }}
                            />
                        </PaginationItem>
                        <PaginationItem>
                            <PaginationLink
                                size="icon-sm"
                                href="#"
                                aria-label={tDataView("lastPage")}
                                aria-disabled={!canNext}
                                className={disabledNext}
                                onClick={(e) => { e.preventDefault(); goToPage(pageCount) }}
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
