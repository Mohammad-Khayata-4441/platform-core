"use client"

import { useState } from "react"
import type { FieldValues, FieldPath } from "react-hook-form"
import {
  useFormContext,
  useController,
} from "react-hook-form"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { FieldShell } from "../field-shell"
import {
  AsyncSelectField,
  AsyncMultiSelectField,
  type AsyncSelectFieldProps,
  type AsyncMultiSelectFieldProps,
} from "../controls/async-select-field"
import { Field, FieldLabel, FieldError, FieldDescription } from "../../shadcn/field"
import { Button } from "../../shadcn/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../shadcn/dialog"
import { ScrollArea } from "../../shadcn/scroll-area"
import { PlusIcon } from "lucide-react"

// ── Inline create types ──

export type InlineCreateFormProps<TValue = string> = {
  onSuccess: (newItem?: { value: TValue; label: string }) => void
}

export type InlineCreateConfig<TValue = string> = {
  createForm: (props: InlineCreateFormProps<TValue>) => React.ReactNode
  createLabel?: string
}

function extractItems(response: unknown): any[] {
  if (Array.isArray(response)) return response
  if (response && typeof response === "object") {
    const obj = response as Record<string, unknown>
    if (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) {
      const nested = obj.data as Record<string, unknown>
      if (Array.isArray(nested.data)) return nested.data
    }
    if (Array.isArray(obj.data)) return obj.data
  }
  return []
}

// ── Props forwarded to the underlying control ──

type AsyncSelectControlProps = Omit<
  AsyncSelectFieldProps,
  keyof import("../types").BaseFieldControlProps<any> | "options" | "loading" | "onInputValueChange"
>

type AsyncMultiSelectControlProps = Omit<
  AsyncMultiSelectFieldProps,
  keyof import("../types").BaseFieldControlProps<any> | "options" | "loading" | "onInputValueChange"
>

// ── Shared base props ──

type BaseRhfAsyncFieldProps = {
  label?: string
  description?: string
  required?: boolean
  disabled?: boolean
  queryKey: string[]
  staleTime?: number
} & Partial<InlineCreateConfig>

type WithLoadOptions = {
  loadOptions: () => Promise<any[]>
  listFn?: never
  mapOption?: never
}

type WithCrudClient<TItem> = {
  loadOptions?: never
  listFn: () => Promise<any>
  mapOption?: (item: TItem) => any
}

type DataSource<TItem = unknown> = WithLoadOptions | WithCrudClient<TItem>

function useAsyncOptions<TItem>(
  queryKey: string[],
  source: DataSource<TItem>,
  staleTime?: number,
) {
  return useQuery<any[]>({
    queryKey,
    queryFn: async () => {
      if ("loadOptions" in source && source.loadOptions) {
        return source.loadOptions()
      }
      if ("listFn" in source && source.listFn) {
        const response = await source.listFn()
        const items = extractItems(response)
        return source.mapOption ? items.map(source.mapOption) : items
      }
      return []
    },
    staleTime: staleTime ?? 5 * 60 * 1000,
  })
}

// ── Single-select wrapper ──

type RhfAsyncSelectFieldProps<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
  TItem = unknown,
> = {
  name: TName
  multiple?: false
} & BaseRhfAsyncFieldProps & DataSource<TItem> & AsyncSelectControlProps

export function RhfAsyncSelectField<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
  TItem = unknown,
>(props: RhfAsyncSelectFieldProps<TValues, TName, TItem>) {
  const {
    name, label, description, required, disabled,
    queryKey, staleTime,
    loadOptions, listFn, mapOption,
    createForm, createLabel,
    ...controlProps
  } = props

  const source = { loadOptions, listFn, mapOption } as DataSource<TItem>

  const { control } = useFormContext<TValues>()
  const { field, fieldState: { error } } = useController({ name, control, disabled })
  const { data: options = [], isLoading } = useAsyncOptions(queryKey, source, staleTime)
  const [inputValue, setInputValue] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const queryClient = useQueryClient()

  const getLabel = controlProps.getOptionLabel ?? ((o: any) => o.label)

  const filtered = inputValue
    ? options.filter((o) => String(getLabel(o)).toLowerCase().includes(inputValue.toLowerCase()))
    : options

  const handleCreateSuccess = (newItem?: { value: string; label: string }) => {
    queryClient.invalidateQueries({ queryKey })
    if (newItem) {
      field.onChange(newItem)
    }
    setIsCreateOpen(false)
  }

  // When a createForm is provided, render a custom label row with the "+" button
  if (createForm) {
    return (
      <Field data-invalid={!!error || undefined}>
        {label && (
          <div className="flex items-center justify-between">
            <FieldLabel>
              {label}
              {required && <span className="text-destructive ms-0.5">*</span>}
            </FieldLabel>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-5 w-5"
              onClick={() => setIsCreateOpen(true)}
              title={`Add new ${createLabel ?? label}`}
            >
              <PlusIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        <AsyncSelectField
          value={field.value}
          onChange={field.onChange}
          onBlur={field.onBlur}
          disabled={field.disabled}
          invalid={!!error}
          options={filtered}
          loading={isLoading}
          onInputValueChange={setInputValue}
          {...controlProps}
        />
        {description && <FieldDescription>{description}</FieldDescription>}
        {error && <FieldError>{error.message}</FieldError>}

        <Dialog open={isCreateOpen} onOpenChange={(v) => { if (!v) setIsCreateOpen(false) }}>
          <DialogContent className="min-w-xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                Add {createLabel ?? label}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[80vh] px-4">
              {createForm({ onSuccess: handleCreateSuccess })}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </Field>
    )
  }

  return (
    <FieldShell label={label} error={error?.message} description={description} required={required}>
      <AsyncSelectField
        value={field.value}
        onChange={field.onChange}
        onBlur={field.onBlur}
        disabled={field.disabled}
        invalid={!!error}
        options={filtered}
        loading={isLoading}
        onInputValueChange={setInputValue}
        {...controlProps}
      />
    </FieldShell>
  )
}

// ── Multi-select wrapper ──

type RhfAsyncMultiSelectFieldProps<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
  TItem = unknown,
> = {
  name: TName
  multiple: true
} & BaseRhfAsyncFieldProps & DataSource<TItem> & AsyncMultiSelectControlProps

export function RhfAsyncMultiSelectField<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
  TItem = unknown,
>(props: RhfAsyncMultiSelectFieldProps<TValues, TName, TItem>) {
  const {
    name, label, description, required, disabled,
    queryKey, staleTime,
    loadOptions, listFn, mapOption,
    ...controlProps
  } = props

  const source = { loadOptions, listFn, mapOption } as DataSource<TItem>

  const { control } = useFormContext<TValues>()
  const { field, fieldState: { error } } = useController({ name, control, disabled })
  const { data: options = [], isLoading } = useAsyncOptions(queryKey, source, staleTime)
  const [inputValue, setInputValue] = useState("")

  const getLabel = controlProps.getOptionLabel ?? ((o: any) => o.label)

  const filtered = inputValue
    ? options.filter((o) => String(getLabel(o)).toLowerCase().includes(inputValue.toLowerCase()))
    : options

  return (
    <FieldShell label={label} error={error?.message} description={description} required={required}>
      <AsyncMultiSelectField
        value={field.value ?? []}
        onChange={field.onChange}
        onBlur={field.onBlur}
        disabled={field.disabled}
        invalid={!!error}
        options={filtered}
        loading={isLoading}
        onInputValueChange={setInputValue}
        {...controlProps}
      />
    </FieldShell>
  )
}
