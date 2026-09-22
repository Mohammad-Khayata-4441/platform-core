import type { ReactNode } from "react"
import type {
  FieldValues,
  FieldPath,
  UseFormReturn,
  SubmitErrorHandler,
} from "react-hook-form"

// ── Base contract for all field control components ──

export type BaseFieldControlProps<TValue = string> = {
  value: TValue
  onChange: (value: TValue) => void
  onBlur?: () => void
  name?: string
  disabled?: boolean
  invalid?: boolean
}

// ── FieldShell props (pure UI) ──

export type FieldShellProps = {
  label?: string
  error?: string
  description?: string
  required?: boolean
  children: ReactNode
}

// ── Rhform props ──

export type RhformProps<TValues extends FieldValues> = {
  form: UseFormReturn<TValues>
  onSubmit: (values: TValues) => void
  errorHandler?: SubmitErrorHandler<TValues>
  children: ReactNode
  className?: string
}

// ── RhfField props ──

export type RhfFieldProps<
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

// ── Option types ──

export type AsyncOption = {
  value: string
  label: string
}

export type SelectOption = {
  value: string
  label: string
}
