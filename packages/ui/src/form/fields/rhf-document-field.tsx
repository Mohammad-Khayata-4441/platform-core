"use client"

import type { FieldValues, FieldPath } from "react-hook-form"
import { RhfField } from "../rhf-field"
import { DocumentInputField, type DocumentInputFieldProps } from "../controls/document-input-field"
import type { BaseFieldControlProps } from "../types"

type RhfDocumentFieldProps<
    TValues extends FieldValues,
    TName extends FieldPath<TValues>,
> = {
    name: TName
    label?: string
    description?: string
    required?: boolean
    disabled?: boolean
} & Omit<DocumentInputFieldProps, keyof BaseFieldControlProps<File | null>>

export function RhfDocumentField<
    TValues extends FieldValues,
    TName extends FieldPath<TValues>,
>(props: RhfDocumentFieldProps<TValues, TName>) {
    return <RhfField {...props} component={DocumentInputField} />
}
