"use client"

import type { FieldValues, FieldPath } from "react-hook-form"
import { RhfField } from "../rhf-field"
import { SelectField, type SelectFieldProps } from "../controls/select-field"
import type { BaseFieldControlProps } from "../types"

type RhfSelectFieldProps<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
> = {
  name: TName
  label?: string
  description?: string
  required?: boolean
  disabled?: boolean
} & Omit<SelectFieldProps, keyof BaseFieldControlProps<string>>

export function RhfSelectField<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
>(props: RhfSelectFieldProps<TValues, TName>) {
  return <RhfField {...props} component={SelectField} />
}
