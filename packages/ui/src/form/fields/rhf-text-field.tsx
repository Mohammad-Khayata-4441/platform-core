"use client"

import type { FieldValues, FieldPath } from "react-hook-form"
import { RhfField } from "../rhf-field"
import { TextInputField, type TextInputFieldProps } from "../controls/text-input-field"
import type { BaseFieldControlProps } from "../types"

type RhfTextFieldProps<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
> = {
  name: TName
  label?: string
  description?: string
  required?: boolean
  disabled?: boolean
} & Omit<TextInputFieldProps, keyof BaseFieldControlProps<string>>

export function RhfTextField<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
>(props: RhfTextFieldProps<TValues, TName>) {
  return <RhfField {...props} component={TextInputField} />
}
