"use client"

import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Plus } from "lucide-react"
import { Button } from "../../shadcn/button"
import { FieldGroup } from "../../shadcn/field"
import { Rhform, RhfTextField } from "../index"
import { toast } from "sonner"
import type { InlineCreateFormProps } from "./rhf-async-select-field"

const schema = z.object({ title: z.string().min(1, "Required") })
type FormValues = z.infer<typeof schema>

export type SimpleTitleFormProps = InlineCreateFormProps & {
  placeholder?: string
  submitLabel?: string
  createFn: (title: string) => Promise<any>
  mapResult?: (data: any) => { value: string; label: string }
}

const defaultMapResult = (data: any) => {
  const item = data?.data ?? data
  return {
    value: String(item.id),
    label: item.name ?? item.title ?? String(item.id),
  }
}

export function SimpleTitleForm({
  onSuccess,
  placeholder = "Enter name",
  submitLabel = "Create",
  createFn,
  mapResult = defaultMapResult,
}: SimpleTitleFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "" },
  })

  const handleSubmit = async (values: FormValues) => {
    try {
      const result = await createFn(values.title)
      toast.success(`${submitLabel}d successfully`)
      form.reset()
      onSuccess(mapResult(result))
    } catch {
      toast.error(`Failed to ${submitLabel.toLowerCase()}`)
    }
  }

  return (
    <Rhform form={form} onSubmit={handleSubmit}>
      <FieldGroup>
        <RhfTextField name="title" label="Name" placeholder={placeholder} required />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          <Plus />
          {form.formState.isSubmitting ? "Creating..." : submitLabel}
        </Button>
      </FieldGroup>
    </Rhform>
  )
}
