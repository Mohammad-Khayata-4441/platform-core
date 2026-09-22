"use client"

import type { FilterFieldType, FilterOperator, ListFilterField } from "@core/api-contracts"
import { Input } from "../../shadcn/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../shadcn/select"
import {
    ResourceSelectField,
    ResourceMultiSelectField,
} from "../../form/controls/resource-select-field"
import { useApi } from "@core/api-client/react"
import { resolveResourceClient, getResourceLabel } from "./resource-client-registry"
import type { FilterRule } from "./filter.utils"
import { operatorNeedsValue } from "./filter.utils"

export type FilterValueInputProps = {
    field: ListFilterField
    operator: FilterOperator
    value: FilterRule["value"]
    onChange: (value: FilterRule["value"]) => void
    disabled?: boolean
}

function BooleanValueInput({
    value,
    onChange,
    disabled,
}: Pick<FilterValueInputProps, "value" | "onChange" | "disabled">) {
    const normalized = value === true ? "true" : value === false ? "false" : ""

    return (
        <Select
            value={normalized}
            onValueChange={(next) => onChange(next === "true")}
            disabled={disabled}
        >
            <SelectTrigger size="sm" className="min-w-28 flex-1">
                <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="true">True</SelectItem>
                <SelectItem value="false">False</SelectItem>
            </SelectContent>
        </Select>
    )
}

function EnumValueInput({
    field,
    value,
    onChange,
    disabled,
}: Pick<FilterValueInputProps, "field" | "value" | "onChange" | "disabled">) {
    return (
        <Select
            value={value != null ? String(value) : ""}
            onValueChange={(next) => onChange(next)}
            disabled={disabled}
        >
            <SelectTrigger size="sm" className="min-w-32 flex-1">
                <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
                {(field.enumValues ?? []).map((option) => (
                    <SelectItem key={option} value={option}>
                        {option}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

function IdValueInput({
    field,
    operator,
    value,
    onChange,
    disabled,
}: Pick<FilterValueInputProps, "field" | "operator" | "value" | "onChange" | "disabled">) {
    const api = useApi()

    if (!field.foreignResourceKey) {
        return (
            <Input
                value={value != null ? String(value) : ""}
                onChange={(event) => onChange(event.target.value || null)}
                placeholder="Enter ID..."
                disabled={disabled}
                className="h-8 flex-1"
            />
        )
    }

    const client = resolveResourceClient(api, field.foreignResourceKey)
    if (!client) {
        return (
            <Input
                value={value != null ? String(value) : ""}
                onChange={(event) => onChange(event.target.value || null)}
                placeholder="Enter value..."
                disabled={disabled}
                className="h-8 flex-1"
            />
        )
    }

    if (operator === "$in") {
        const arrayValue = Array.isArray(value) ? (value as string[]) : []
        return (
            <ResourceMultiSelectField
                client={client}
                getLabel={getResourceLabel}
                value={arrayValue}
                onChange={(next) => onChange(next)}
                placeholder="Select..."
                disabled={disabled}
                lazy
            />
        )
    }

    return (
        <ResourceSelectField
            client={client}
            getLabel={getResourceLabel}
            value={value != null ? String(value) : null}
            onChange={(next) => onChange(next)}
            placeholder="Select..."
            disabled={disabled}
            lazy
        />
    )
}

function getInputType(type: FilterFieldType): React.HTMLInputTypeAttribute {
    switch (type) {
        case "number":
            return "number"
        case "date":
            return "date"
        default:
            return "text"
    }
}

function ScalarValueInput({
    field,
    value,
    onChange,
    disabled,
}: Pick<FilterValueInputProps, "field" | "value" | "onChange" | "disabled">) {
    return (
        <Input
            type={getInputType(field.type)}
            value={value != null ? String(value) : ""}
            onChange={(event) => {
                const next = event.target.value
                if (!next) {
                    onChange(null)
                    return
                }

                if (field.type === "number") {
                    const parsed = Number(next)
                    onChange(Number.isNaN(parsed) ? null : parsed)
                    return
                }

                onChange(next)
            }}
            placeholder="Enter value..."
            disabled={disabled}
            className="h-8 flex-1"
        />
    )
}

export function FilterValueInput(props: FilterValueInputProps) {
    const { operator } = props

    if (!operatorNeedsValue(operator)) {
        return (
            <Input
                value=""
                placeholder="No value needed"
                disabled
                className="h-8 flex-1"
            />
        )
    }

    switch (props.field.type) {
        case "boolean":
            return <BooleanValueInput {...props} />
        case "enum":
            return <EnumValueInput {...props} />
        case "id":
            return <IdValueInput field={props.field} operator={props.operator} value={props.value} onChange={props.onChange} disabled={props.disabled} />
        default:
            return <ScalarValueInput {...props} />
    }
}
