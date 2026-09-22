import type { BaseFieldControlProps } from "../types"
import { Input } from "../../shadcn/input"

export type FileInputFieldProps = BaseFieldControlProps<File | null> & {
  accept?: string
}

export function FileInputField({
  // value intentionally unused — file inputs cannot be controlled
  onBlur,
  name,
  disabled,
  invalid,
  accept,
  onChange,
}: FileInputFieldProps) {
  return (
    <Input
      type="file"
      accept={accept}
      onBlur={onBlur}
      name={name}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      onChange={(e) => onChange(e.target.files?.[0] ?? null)}
    />
  )
}
