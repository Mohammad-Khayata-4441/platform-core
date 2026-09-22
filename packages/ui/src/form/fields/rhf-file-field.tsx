"use client"

import type { FieldValues, FieldPath } from "react-hook-form"
import { RhfField } from "../rhf-field"
import { FileInputField, type FileInputFieldProps } from "../controls/file-input-field"
import type { BaseFieldControlProps } from "../types"

type RhfFileFieldProps<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
> = {
  name: TName
  label?: string
  description?: string
  required?: boolean
  disabled?: boolean
} & Omit<FileInputFieldProps, keyof BaseFieldControlProps<File | null>>

export function RhfFileField<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
>(props: RhfFileFieldProps<TValues, TName>) {
  return <RhfField {...props} component={FileInputField} />
}
