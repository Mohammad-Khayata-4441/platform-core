"use client"

import type { FieldValues, FieldPath } from "react-hook-form"
import { useFormContext, useController } from "react-hook-form"
import { CheckboxField, type CheckboxFieldProps } from "../controls/checkbox-field"
import type { BaseFieldControlProps } from "../types"
import { FieldError } from "../../shadcn/field"

type RhfCheckboxFieldProps<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
> = {
  name: TName
  label?: string
  description?: string
  required?: boolean
  disabled?: boolean
} & Omit<CheckboxFieldProps, keyof BaseFieldControlProps<boolean>>

export function RhfCheckboxField<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
>({
  name,
  label,
  description,
  required,
  disabled,
  ...controlProps
}: RhfCheckboxFieldProps<TValues, TName>) {
  const { control } = useFormContext<TValues>()
  const {
    field,
    fieldState: { error },
  } = useController({ name, control, disabled })

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
      <div className="flex-1 space-y-0.5">
        {label && (
          <p className="text-sm font-medium leading-none">
            {label}
            {required && <span className="text-destructive"> *</span>}
          </p>
        )}
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        {error && <FieldError>{error.message}</FieldError>}
      </div>
      <CheckboxField
        {...(controlProps as any)}
        value={field.value}
        onChange={field.onChange}
        onBlur={field.onBlur}
        name={field.name}
        disabled={field.disabled}
        invalid={!!error}
      />
    </div>
  )
}
