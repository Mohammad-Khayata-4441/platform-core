"use client"

import type { BaseFieldControlProps, SelectOption } from "../types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../shadcn/select"

export type SelectFieldProps = BaseFieldControlProps<string> & {
  placeholder?: string
  options: SelectOption[]
}

export function SelectField({
  value,
  onChange,
  onBlur,
  name,
  disabled,
  invalid,
  placeholder,
  options,
}: SelectFieldProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled} name={name}>
      <SelectTrigger
        className="w-full"
        aria-invalid={invalid || undefined}
        onBlur={onBlur}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
