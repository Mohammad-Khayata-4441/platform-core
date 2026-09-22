"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "../../lib/i18n"
import { ListFilterIcon, PlusIcon } from "lucide-react"
import type { ListFilterField, ParsedFilters } from "@core/api-contracts"
import { Button } from "../../shadcn/button"
import {
    Popover,
    PopoverContent,
    PopoverHeader,
    PopoverTitle,
    PopoverTrigger,
} from "../../shadcn/popover"
import { cn } from "../../lib/cn"
import { FilterRuleRow } from "./filter-rule-row"
import {
    createEmptyRule,
    parsedFiltersToRules,
    rulesToParsedFilters,
    type FilterRule,
} from "./filter.utils"

export type ResourceFilterPanelProps = {
    filterOptions: ListFilterField[]
    value: ParsedFilters | null | undefined
    onChange: (filters: ParsedFilters | null) => void
    className?: string
}

export function ResourceFilterPanel({
    filterOptions,
    value,
    onChange,
    className,
}: ResourceFilterPanelProps) {
    const t = useTranslations("system.resourceFilter")
    const [open, setOpen] = useState(false)
    const [rules, setRules] = useState<FilterRule[]>([])

    const availableFields = useMemo(
        () => filterOptions.filter((option) => option.operators.length > 0),
        [filterOptions],
    )

    useEffect(() => {
        if (!open) return
        const nextRules = parsedFiltersToRules(value, availableFields)
        setRules(nextRules.length > 0 ? nextRules : availableFields[0] ? [createEmptyRule(availableFields[0])] : [])
    }, [open, value, availableFields])

    if (availableFields.length === 0) {
        return null
    }

    const activeCount = value ? Object.keys(value).length : 0

    const applyFilters = () => {
        const parsed = rulesToParsedFilters(rules)
        onChange(Object.keys(parsed).length > 0 ? parsed : null)
        setOpen(false)
    }

    const clearFilters = () => {
        setRules(availableFields[0] ? [createEmptyRule(availableFields[0])] : [])
        onChange(null)
        setOpen(false)
    }

    const addRule = () => {
        const usedFields = new Set(rules.map((rule) => rule.field))
        const nextField =
            availableFields.find((option) => !usedFields.has(option.field)) ??
            availableFields[0]

        if (!nextField) return
        setRules((current) => [...current, createEmptyRule(nextField)])
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                        "h-10 bg-background",
                        activeCount > 0 && "border-primary/50 text-primary shadow-sm",
                        className,
                    )}
                >
                    <ListFilterIcon className="size-4 me-2" />
                    {t("button")}
                    {activeCount > 0 ? ` (${activeCount})` : ""}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[min(42rem,calc(100vw-2rem))] p-4">
                <PopoverHeader>
                    <PopoverTitle>{t("title")}</PopoverTitle>
                </PopoverHeader>

                <div className="flex flex-col gap-3">
                    {rules.map((rule, index) => (
                        <FilterRuleRow
                            key={rule.id}
                            rule={rule}
                            filterOptions={availableFields}
                            showWhereLabel={index === 0}
                            onChange={(nextRule) =>
                                setRules((current) =>
                                    current.map((item) =>
                                        item.id === nextRule.id ? nextRule : item,
                                    ),
                                )
                            }
                            onRemove={() =>
                                setRules((current) => {
                                    const next = current.filter((item) => item.id !== rule.id)
                                    if (next.length === 0 && availableFields[0]) {
                                        return [createEmptyRule(availableFields[0])]
                                    }
                                    return next
                                })
                            }
                        />
                    ))}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={addRule}
                        disabled={rules.length >= availableFields.length}
                    >
                        <PlusIcon className="size-4 me-2" />
                        {t("addFilter")}
                    </Button>

                    <div className="flex items-center gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                            {t("clearAll")}
                        </Button>
                        <Button type="button" size="sm" onClick={applyFilters}>
                            {t("apply")}
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
