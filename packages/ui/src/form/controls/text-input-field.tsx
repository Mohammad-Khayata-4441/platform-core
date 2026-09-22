import type { BaseFieldControlProps } from "../types"
import { Input } from "../../shadcn/input"

export type TextInputFieldProps = BaseFieldControlProps<string> & {
  placeholder?: string
  type?: React.HTMLInputTypeAttribute
}

export function TextInputField({
  value,
  onChange,
  onBlur,
  name,
  disabled,
  invalid,
  placeholder,
  type = "text",
}: TextInputFieldProps) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      name={name}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      placeholder={placeholder}
      type={type}
    />
  )
}
