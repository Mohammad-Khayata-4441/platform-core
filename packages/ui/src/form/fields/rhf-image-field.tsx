"use client"

import type { FieldValues, FieldPath } from "react-hook-form"
import { RhfField } from "../rhf-field"
import { ImageInputField, type ImageInputFieldProps } from "../controls/image-input-field"
import type { BaseFieldControlProps } from "../types"

type RhfImageFieldProps<
    TValues extends FieldValues,
    TName extends FieldPath<TValues>,
> = {
    name: TName
    label?: string
    description?: string
    required?: boolean
    disabled?: boolean
} & Omit<ImageInputFieldProps, keyof BaseFieldControlProps<string | null>>

export function RhfImageField<
    TValues extends FieldValues,
    TName extends FieldPath<TValues>,
>(props: RhfImageFieldProps<TValues, TName>) {
    return <RhfField {...props} component={ImageInputField} />
}
