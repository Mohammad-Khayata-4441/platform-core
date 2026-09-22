"use client"

import type { BaseFieldControlProps } from "../types"
import { Switch } from "../../shadcn/switch"

export type CheckboxFieldProps = BaseFieldControlProps<boolean> & {
  label?: string
}

export function CheckboxField({
  value,
  onChange,
  onBlur,
  name,
  disabled,
  invalid,
}: CheckboxFieldProps) {
  return (
    <Switch
      checked={value}
      onCheckedChange={(checked) => onChange(checked === true)}
      onBlur={onBlur}
      name={name}
      disabled={disabled}
      aria-invalid={invalid || undefined}
    />
  )
}
