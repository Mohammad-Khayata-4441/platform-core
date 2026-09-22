"use client"

import type { FilterOperator, ListFilterField } from "@core/api-contracts"
import { useTranslations } from "../../lib/i18n"
import { Trash2Icon } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../shadcn/select"
import { Button } from "../../shadcn/button"
import { FilterValueInput } from "./filter-value-input"
import type { FilterRule } from "./filter.utils"
import { getDefaultOperator, getFieldLabel } from "./filter.utils"

export type FilterRuleRowProps = {
    rule: FilterRule
    filterOptions: ListFilterField[]
    showWhereLabel?: boolean
    onChange: (rule: FilterRule) => void
    onRemove: () => void
}

function getOperatorLabel(
    operator: FilterOperator,
    labels: Record<string, string>,
): string {
    return labels[operator] ?? operator
}

export function FilterRuleRow({
    rule,
    filterOptions,
    showWhereLabel = false,
    onChange,
    onRemove,
}: FilterRuleRowProps) {
    const t = useTranslations("system.resourceFilter")
    const selectedField =
        filterOptions.find((option) => option.field === rule.field) ?? filterOptions[0]

    const operatorLabels: Record<FilterOperator, string> = {
        $eq: t("operators.eq"),
        $like: t("operators.like"),
        $gte: t("operators.gte"),
        $lte: t("operators.lte"),
        $in: t("operators.in"),
        $isNull: t("operators.isNull"),
    }

    const handleFieldChange = (field: string) => {
        const nextField = filterOptions.find((option) => option.field === field)
        if (!nextField) return

        onChange({
            ...rule,
            field,
            operator: getDefaultOperator(nextField),
            value: null,
        })
    }

    const handleOperatorChange = (operator: FilterOperator) => {
        onChange({
            ...rule,
            operator,
            value: operator === "$isNull" ? null : rule.value,
        })
    }

    if (!selectedField) return null

    return (
        <div className="flex items-center gap-2">
            {showWhereLabel ? (
                <span className="w-14 shrink-0 text-sm text-muted-foreground">
                    {t("where")}
                </span>
            ) : (
                <span className="w-14 shrink-0 text-sm text-muted-foreground">
                    {t("and")}
                </span>
            )}

            <Select value={rule.field} onValueChange={handleFieldChange}>
                <SelectTrigger size="sm" className="min-w-36">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {filterOptions.map((option) => (
                        <SelectItem key={option.field} value={option.field}>
                            {getFieldLabel(option.field)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select
                value={rule.operator}
                onValueChange={(operator) => handleOperatorChange(operator as FilterOperator)}
            >
                <SelectTrigger size="sm" className="min-w-32">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {selectedField.operators.map((operator) => (
                        <SelectItem key={operator} value={operator}>
                            {getOperatorLabel(operator, operatorLabels)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <FilterValueInput
                field={selectedField}
                operator={rule.operator}
                value={rule.value}
                onChange={(value) => onChange({ ...rule, value })}
            />

            <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onRemove}
                aria-label={t("removeRule")}
            >
                <Trash2Icon className="size-4" />
            </Button>
        </div>
    )
}
