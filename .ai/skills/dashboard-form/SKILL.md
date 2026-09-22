---
name: dashboard-form
description: Builds or modifies dashboard CRUD form components (modules/<r>/components/<r>-form.tsx) and their declarative config (modules/<r>/<r>.config.ts) using useResourceFormController + ResourceFormShell. Use for create/edit forms, dialogs, new form fields, schema/mapper changes, or any time the form pattern needs to be enforced.
---

# Dashboard Form

The single skill to load **any time you touch a form in `apps/dashboard`** — creating one, editing one, adding a field, changing the create/update payload, or wiring a relation select.

Full architecture: [`.ai/docs/forms-architecture.md`](../../docs/forms-architecture.md). This file is the checklist + the **hook you must call** when implementing or modifying a form.

---

## When to trigger this skill

Load this skill if any of the following are true:

- You are creating, renaming, or refactoring `modules/<r>/components/<r>-form.tsx`
- You are creating or changing `modules/<r>/<r>.config.ts`
- You are adding/removing a field on an existing form
- You are wiring a new form into `<Resource.FormDialog>`
- You are introducing a new `Rhf*` field wrapper usage
- The user mentions "form", "create dialog", "edit dialog", "validation", "form values", "toCreate", "toUpdate"

---

## The hook you MUST trigger

When implementing a form, the entry point is:

```ts
import { useResourceFormController } from "@/shared/hooks/use-resource-form-controller"
```

If you are about to write `useForm`, `useMutation`, `useFormDialog`, `useEffect(() => form.reset(...))`, or `toast.promise` directly in a form component — **stop**. That work belongs to `useResourceFormController` and its building blocks:

| Concern | Hook that owns it (do NOT re-implement) |
|---------|-----------------------------------------|
| `useForm` + zod resolver + initial fetch + `mapToFormValues` reset | `useResourceForm` |
| `useMutation` + per-field error mapping from `ApiError.validationErrors` | `useFormMutation` |
| `useFormDialog` close on success | `useFormDialog` |
| `toast.promise` for create/update with localized messages | `useResourceFormController` |
| `form.reset(defaults)` on success | `useResourceFormController` |
| create vs update branching by `resourceId` | `useResourceFormController` |

The form component itself only:

1. Calls `useResourceFormController` with `{ config, getClient, entityLabel, resourceId, initialData, paramKey, onSuccess }`.
2. Renders `<ResourceFormShell ctrl={ctrl}>` with the field list as children.

---

## The two files you create / change

### 1. `modules/<r>/<r>.config.ts` — pure TS, no JSX

```ts
import { z } from "zod"
import type { CreateXDto, UpdateXDto } from "@core/api-contracts"
import type { ResourceFormConfig } from "@/shared/hooks/use-resource-form-controller"
import { unwrapApiData } from "@/shared/hooks/unwrap-api-data"

export const xFormSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    isActive: z.boolean().optional(),
})

export type XFormValues = z.infer<typeof xFormSchema>

export const DEFAULT_X_FORM_VALUES: XFormValues = {
    name: "",
    isActive: true,
}

export function mapXToFormValues(data: unknown): XFormValues {
    const resolved = unwrapApiData<XFormValues>(data)
    return {
        name: resolved.name ?? "",
        isActive: resolved.isActive ?? true,
    }
}

export const xFormConfig: ResourceFormConfig<XFormValues, CreateXDto, UpdateXDto> = {
    schema: xFormSchema,
    defaultValues: DEFAULT_X_FORM_VALUES,
    mapToFormValues: mapXToFormValues,
    toCreate: (values) => ({ name: values.name.trim() }),
    toUpdate: (values) => ({ name: values.name.trim(), isActive: values.isActive ?? true }),
}
```

### 2. `modules/<r>/components/<r>-form.tsx` — thin JSX

```tsx
"use client"

import { useTranslations } from "next-intl"
import { type XClient } from "@core/api-client"
import { ResourceFormShell, RhfCheckboxField, RhfTextField } from "@/shared/components/form"
import type { ResourceFormProps } from "@/shared/data-view/resource"
import { useResourceFormController } from "@/shared/hooks/use-resource-form-controller"
import { xFormConfig, type XFormValues } from "../x.config"

export function XForm({ resourceId, initialData, onSuccess, paramKey }: ResourceFormProps<XClient>) {
    const t = useTranslations("business.resources.x")
    const tf = useTranslations("system.resourceForm")

    const ctrl = useResourceFormController<XClient, XFormValues>({
        config: xFormConfig,
        getClient: (api) => api.x,
        entityLabel: t("entity"),
        resourceId,
        initialData,
        paramKey,
        onSuccess,
    })

    return (
        <ResourceFormShell ctrl={ctrl}>
            <RhfTextField name="name" label={t("name")} placeholder={t("namePlaceholder")} required disabled={ctrl.isBusy} />
            {ctrl.isEditing && (
                <RhfCheckboxField name="isActive" label={t("active")} description={tf("activeDescription")} disabled={ctrl.isBusy} />
            )}
        </ResourceFormShell>
    )
}
```

---

## Conventions (do not skip)

- **No `useForm` / `useMutation` / `useEffect(reset)` in the form component** — that's the controller's job.
- **Two translation hooks**: `t` = `business.resources.<r>.*`, `tf` = `system.resourceForm.*`. No inline literals.
- **Every field is `disabled={ctrl.isBusy}`** — covers both submission and the initial edit fetch.
- **`isActive` checkbox is gated by `{ctrl.isEditing && ...}`** — defaults already make it `true` on create.
- **`*.config.ts` never imports React or contains JSX** — it's pure TS so tests/validators can import it.
- **`map*ToFormValues` always goes through `unwrapApiData`** — some endpoints return `{ data }` envelopes.
- **Relation fields store the full object (`{id,name}`) in the form**, not the ID. Convert to `parentId` in `toCreate` / `toUpdate`.
- **The create payload omits `isActive`** unless the API requires it — `toUpdate` sends it.
- **Re-export** schema, defaults, mapper, and `*FormValues` from `modules/<r>/index.ts`.

---

## Available `Rhf*` field components

All from `@/shared/components/form`. Common props: `name`, `label?`, `description?`, `required?`, `disabled?`.

| Field | Renders | Typical use |
|-------|---------|-------------|
| `RhfTextField` | `<TextInputField>` | Short text (`name`, `code`, `abbreviation`, `address`) |
| `RhfTextareaField` | `<TextareaField>` | Long text (`description`, `notes`) |
| `RhfCheckboxField` | `<CheckboxField>` (side label + description) | `isActive` toggles |
| `RhfSelectField` | `<SelectField>` | Static enums |
| `RhfAsyncSelectField` | `<AsyncSelectField>` | Server-driven options w/ debounced search |
| `RhfResourceSelect` | `<ResourceSelectField>` | **Pick an entity from another CRUD resource** (e.g. parent category) |
| `RhfResourceMultiSelect` | `<ResourceMultiSelectField>` | Many-to-many pickers |
| `RhfFileField` / `RhfImageField` / `RhfDocumentField` | uploaders | Attachments |

### `RhfResourceSelect` example

```tsx
<RhfResourceSelect
    name="parent"
    label={t("parent")}
    placeholder={t("parentPlaceholder")}
    client={(api) => api[itemCategoryResource.key]}
    getLabel={(item) => item.name}
    getValue={(item) => item}      // store whole {id,name} in the form
    pageSize={20}
    disabled={ctrl.isBusy}
/>
```

---

## i18n

| Namespace | Use for |
|-----------|---------|
| `business.resources.<r>.*` | `name`, `namePlaceholder`, `active`, `entity`, … |
| `system.resourceForm.*` | `creating`, `updating`, `created`, `updated`, `createFailed`, `updateFailed`, `create`, `update`, `activeDescription` |

Source: `packages/i18n/src/{en,ar,tr,ar-SY}/system.json` (`resourceForm` block) and `business.json`. Add new shared strings to **all** locales.

---

## Verification before claiming "done"

- [ ] `*.config.ts` has `schema`, `DEFAULT_*_FORM_VALUES`, `map*ToFormValues`, `*FormConfig: ResourceFormConfig<...>`
- [ ] `*FormValues`, `DEFAULT_*_FORM_VALUES`, `map*ToFormValues` exported from the config and re-exported from `modules/<r>/index.ts`
- [ ] Form calls `useResourceFormController<TClient, TFormValues, TCreate, TUpdate>({ config, getClient, entityLabel, resourceId, initialData, paramKey, onSuccess })`
- [ ] Form renders `<ResourceFormShell ctrl={ctrl}>` with only fields as children — no `<form>`, no error alert, no submit button
- [ ] Every field has `disabled={ctrl.isBusy}`
- [ ] `isActive` is gated by `{ctrl.isEditing && ...}`
- [ ] No `useForm`, no `useMutation`, no `useEffect(reset)`, no `toast.promise` in the form component
- [ ] Page uses `actions={<Resource.FormDialog form={<R>Form} title={...} />}`
- [ ] `pnpm --filter @core/dashboard lint` passes

---

## Examples (golden references)

- `apps/dashboard/modules/units/` — simplest form (text + text + isActive)
- `apps/dashboard/modules/categories/` — adds `RhfResourceSelect` (`parent`)
- `apps/dashboard/modules/warehouses/` — multi-field text + isActive

Read the config and form for **one** of these end-to-end before writing a new one.

## Reference

- Architecture doc: [`.ai/docs/forms-architecture.md`](../../docs/forms-architecture.md)
- Controller: `apps/dashboard/shared/hooks/use-resource-form-controller.ts`
- Shell: `apps/dashboard/shared/components/form/resource-form-shell.tsx`
- Form infrastructure: `apps/dashboard/shared/hooks/use-resource-form.ts`, `use-form-mutation.ts`
- Field wrappers: `apps/dashboard/shared/components/form/fields/`
- Dialog wiring: `apps/dashboard/shared/data-view/resource/resource-form-dialog.tsx`
