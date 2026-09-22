import type {
    FilterCondition,
    FilterFieldType,
    FilterOperator,
    ListFilterField,
    ParsedFilters,
} from "@core/api-contracts"

export type FilterRule = {
    id: string
    field: string
    operator: FilterOperator
    value: string | number | boolean | (string | number)[] | null
}

const DEFAULT_OPERATOR_BY_TYPE: Record<FilterFieldType, FilterOperator> = {
    string: "$like",
    id: "$eq",
    number: "$eq",
    boolean: "$eq",
    date: "$gte",
    enum: "$eq",
}

export function getDefaultOperator(field: ListFilterField): FilterOperator {
    return field.operators[0] ?? DEFAULT_OPERATOR_BY_TYPE[field.type]
}

export function createEmptyRule(field: ListFilterField): FilterRule {
    return {
        id: crypto.randomUUID(),
        field: field.field,
        operator: getDefaultOperator(field),
        value: null,
    }
}

export function conditionToRuleValue(
    condition: FilterCondition,
): FilterRule["value"] {
    if ("$eq" in condition) return condition.$eq
    if ("$like" in condition) return condition.$like
    if ("$gte" in condition) return condition.$gte
    if ("$lte" in condition) return condition.$lte
    if ("$in" in condition) return condition.$in
    if ("$isNull" in condition) return null
    return null
}

export function parsedFiltersToRules(
    filters: ParsedFilters | null | undefined,
    filterOptions: ListFilterField[],
): FilterRule[] {
    if (!filters) return []

    return Object.entries(filters).flatMap(([field, condition]) => {
        const option = filterOptions.find((item) => item.field === field)
        if (!option) return []

        const operator = getOperatorFromCondition(condition)
        if (!operator) return []

        return [
            {
                id: crypto.randomUUID(),
                field,
                operator,
                value: conditionToRuleValue(condition),
            },
        ]
    })
}

export function getOperatorFromCondition(
    condition: FilterCondition,
): FilterOperator | undefined {
    if ("$eq" in condition) return "$eq"
    if ("$like" in condition) return "$like"
    if ("$gte" in condition) return "$gte"
    if ("$lte" in condition) return "$lte"
    if ("$in" in condition) return "$in"
    if ("$isNull" in condition) return "$isNull"
    return undefined
}

export function ruleToCondition(rule: FilterRule): FilterCondition | null {
    if (rule.operator === "$isNull") {
        return { $isNull: true }
    }

    const value = rule.value
    if (value === null || value === undefined || value === "") {
        return null
    }

    switch (rule.operator) {
        case "$eq":
            return { $eq: value as string | number | boolean }
        case "$like":
            return { $like: String(value) }
        case "$gte":
            return { $gte: value as string | number }
        case "$lte":
            return { $lte: value as string | number }
        case "$in":
            return {
                $in: Array.isArray(value) ? value : [value as string | number],
            }
        default:
            return null
    }
}

export function rulesToParsedFilters(rules: FilterRule[]): ParsedFilters {
    const filters: ParsedFilters = {}

    for (const rule of rules) {
        const condition = ruleToCondition(rule)
        if (condition) {
            filters[rule.field] = condition
        }
    }

    return filters
}

export function appendFiltersToParams(
    params: Record<string, unknown>,
    filters: ParsedFilters | null | undefined,
): void {
    if (!filters) return

    for (const [field, condition] of Object.entries(filters)) {
        if ("$eq" in condition) {
            params[`filters[${field}][$eq]`] = condition.$eq
        } else if ("$like" in condition) {
            params[`filters[${field}][$like]`] = condition.$like
        } else if ("$gte" in condition) {
            params[`filters[${field}][$gte]`] = condition.$gte
        } else if ("$lte" in condition) {
            params[`filters[${field}][$lte]`] = condition.$lte
        } else if ("$in" in condition) {
            params[`filters[${field}][$in][]`] = condition.$in
        } else if ("$isNull" in condition) {
            params[`filters[${field}][$isNull]`] = "true"
        }
    }
}

export function operatorNeedsValue(operator: FilterOperator): boolean {
    return operator !== "$isNull"
}

export function getFieldLabel(field: string): string {
    return field
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (char) => char.toUpperCase())
        .trim()
}
