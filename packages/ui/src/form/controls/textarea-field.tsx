import type { BaseFieldControlProps } from "../types"
import { Textarea } from "../../shadcn/textarea"

export type TextareaFieldProps = BaseFieldControlProps<string> & {
  placeholder?: string
  rows?: number
}

export function TextareaField({
  value,
  onChange,
  onBlur,
  name,
  disabled,
  invalid,
  placeholder,
  rows,
}: TextareaFieldProps) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      name={name}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      placeholder={placeholder}
      rows={rows}
    />
  )
}
