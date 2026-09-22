"use client"

import { useState } from "react"
import { useFormContext, useController } from "react-hook-form"
import type { FieldValues, FieldPath } from "react-hook-form"
import { useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import type { ICrudClient } from "@core/api-client"
import { useApi } from "@core/api-client/react"
import { FieldShell } from "../field-shell"
import {
  ResourceSelectField,
  ResourceMultiSelectField,
  type ResourceSelectFieldProps,
  type ResourceMultiSelectFieldProps,
} from "../controls/resource-select-field"
import { Field, FieldLabel, FieldError, FieldDescription } from "../../shadcn/field"
import { Button } from "../../shadcn/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../shadcn/dialog"
import { ScrollArea } from "../../shadcn/scroll-area"
import { SettingsIcon } from "lucide-react"

type InlineCreateHandler = {
  onSuccess: (newItem?: { value: unknown; label: string }) => void
}

type OmitControlProps<T> = Omit<T, "value" | "onChange" | "onBlur" | "disabled" | "invalid">

export type RhfResourceSelectProps<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
  TClient extends ICrudClient = ICrudClient,
  TValue = string,
> = {
  name: TName
  label?: string
  description?: string
  required?: boolean
  disabled?: boolean
  createForm?: (props: InlineCreateHandler) => React.ReactNode
  createLabel?: string
  configPageHref?: string
} & OmitControlProps<ResourceSelectFieldProps<TClient, TValue>>

export function RhfResourceSelect<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
  TClient extends ICrudClient = ICrudClient,
  TValue = string,
>(props: RhfResourceSelectProps<TValues, TName, TClient, TValue>) {
  const {
    name,
    label,
    description,
    required,
    disabled: disabledProp,
    createForm,
    createLabel,
    configPageHref,
    ...controlProps
  } = props

  const api = useApi()
  const queryClient = useQueryClient()
  const { control } = useFormContext<TValues>()
  const { field, fieldState: { error } } = useController({
    name,
    control,
    disabled: disabledProp,
  })
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const resolvedClient = typeof controlProps.client === "function"
    ? controlProps.client(api)
    : controlProps.client
  const clientKey = resolvedClient.key
  const resolvedQueryKey = controlProps.queryKey ?? [clientKey]

  const handleCreateSuccess = (newItem?: { value: unknown; label: string }) => {
    queryClient.invalidateQueries({ queryKey: resolvedQueryKey })
    if (newItem) {
      field.onChange(newItem.value as TValue)
    }
    setIsCreateOpen(false)
  }

  if (createForm) {
    const createItemLabel = `Add new ${createLabel ?? label ?? ""}`.trim()

    return (
      <Field data-invalid={!!error || undefined}>
        {label && (
          <div className="flex items-center justify-between">
            <FieldLabel>
              {label}
              {required && <span className="text-destructive ms-0.5">*</span>}
            </FieldLabel>
            {configPageHref && (
              <Button asChild size="icon" variant="ghost" className="h-5 w-5">
                <Link href={configPageHref} title={`Manage ${createLabel ?? label}`}>
                  <SettingsIcon className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </div>
        )}
        <ResourceSelectField
          value={field.value ?? null}
          onChange={field.onChange}
          onBlur={field.onBlur}
          disabled={field.disabled}
          invalid={!!error}
          onCreateClick={() => setIsCreateOpen(true)}
          createLabel={createItemLabel}
          {...(controlProps as any)}
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
      <ResourceSelectField
        value={field.value ?? null}
        onChange={field.onChange}
        onBlur={field.onBlur}
        disabled={field.disabled}
        invalid={!!error}
        {...(controlProps as any)}
      />
    </FieldShell>
  )
}

export type RhfResourceMultiSelectProps<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
  TClient extends ICrudClient = ICrudClient,
  TValue = string,
> = {
  name: TName
  label?: string
  description?: string
  required?: boolean
  disabled?: boolean
} & OmitControlProps<ResourceMultiSelectFieldProps<TClient, TValue>>

export function RhfResourceMultiSelect<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
  TClient extends ICrudClient = ICrudClient,
  TValue = string,
>(props: RhfResourceMultiSelectProps<TValues, TName, TClient, TValue>) {
  const {
    name,
    label,
    description,
    required,
    disabled: disabledProp,
    ...controlProps
  } = props

  const { control } = useFormContext<TValues>()
  const { field, fieldState: { error } } = useController({
    name,
    control,
    disabled: disabledProp,
  })

  return (
    <FieldShell label={label} error={error?.message} description={description} required={required}>
      <ResourceMultiSelectField
        value={field.value ?? []}
        onChange={field.onChange}
        onBlur={field.onBlur}
        disabled={field.disabled}
        invalid={!!error}
        {...(controlProps as any)}
      />
    </FieldShell>
  )
}