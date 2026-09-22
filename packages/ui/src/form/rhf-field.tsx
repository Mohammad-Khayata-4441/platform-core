"use client"

import {
  useFormContext,
  useController,
  type FieldValues,
  type FieldPath,
} from "react-hook-form"
import { FieldShell } from "./field-shell"
import type { BaseFieldControlProps } from "./types"

type RhfFieldProps<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
  TControlProps extends BaseFieldControlProps<any>,
> = {
  name: TName
  label?: string
  description?: string
  required?: boolean
  disabled?: boolean
  component: React.ComponentType<TControlProps>
} & Omit<TControlProps, keyof BaseFieldControlProps<any>>

export function RhfField<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
  TControlProps extends BaseFieldControlProps<any>,
>({
  name,
  label,
  description,
  required,
  disabled,
  component: Component,
  ...controlProps
}: RhfFieldProps<TValues, TName, TControlProps>) {
  const { control } = useFormContext<TValues>()
  const {
    field,
    fieldState: { error },
  } = useController({ name, control, disabled })

  return (
    <FieldShell
      label={label}
      error={error?.message}
      description={description}
      required={required}
    >
      <Component
        {...(controlProps as any)}
        value={field.value}
        onChange={field.onChange}
        onBlur={field.onBlur}
        name={field.name}
        disabled={field.disabled}
        invalid={!!error}
      />
    </FieldShell>
  )
}
