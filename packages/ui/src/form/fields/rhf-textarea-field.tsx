"use client"

import type { FieldValues, FieldPath } from "react-hook-form"
import { RhfField } from "../rhf-field"
import { TextareaField, type TextareaFieldProps } from "../controls/textarea-field"
import type { BaseFieldControlProps } from "../types"

type RhfTextareaFieldProps<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
> = {
  name: TName
  label?: string
  description?: string
  required?: boolean
  disabled?: boolean
} & Omit<TextareaFieldProps, keyof BaseFieldControlProps<string>>

export function RhfTextareaField<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
>(props: RhfTextareaFieldProps<TValues, TName>) {
  return <RhfField {...props} component={TextareaField} />
}
