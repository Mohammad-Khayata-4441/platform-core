"use client"

import type { FieldValues, FieldPath } from "react-hook-form"
import { RhfField } from "../rhf-field"
import { GalleryImageUploadField, type GalleryImageUploadFieldProps } from "../controls/gallery-image-upload-field"
import type { BaseFieldControlProps } from "../types"

type RhfGalleryImageFieldProps<
    TValues extends FieldValues,
    TName extends FieldPath<TValues>,
> = {
    name: TName
    label?: string
    description?: string
    required?: boolean
    disabled?: boolean
} & Omit<GalleryImageUploadFieldProps, keyof BaseFieldControlProps<string[]>>

export function RhfGalleryImageField<
    TValues extends FieldValues,
    TName extends FieldPath<TValues>,
>(props: RhfGalleryImageFieldProps<TValues, TName>) {
    return <RhfField {...props} component={GalleryImageUploadField} />
}
