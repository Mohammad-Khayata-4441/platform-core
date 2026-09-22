"use client"

import type { FieldValues, FieldPath } from "react-hook-form"
import { RhfField } from "../rhf-field"
import { DatePickerField, type DatePickerFieldProps } from "../controls/date-picker-field"
import type { BaseFieldControlProps } from "../types"

type RhfDateFieldProps<
    TValues extends FieldValues,
    TName extends FieldPath<TValues>,
> = {
    name: TName
    label?: string
    description?: string
    required?: boolean
    disabled?: boolean
} & Omit<DatePickerFieldProps, keyof BaseFieldControlProps<string>>

export function RhfDateField<
    TValues extends FieldValues,
    TName extends FieldPath<TValues>,
>(props: RhfDateFieldProps<TValues, TName>) {
    return <RhfField {...props} component={DatePickerField} />
}
