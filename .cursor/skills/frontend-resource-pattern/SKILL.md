---
name: frontend-resource-pattern
description: Use ONLY when creating, refactoring, or debugging resource CRUD pages in the dashboard app (apps/dashboard). Covers the compound component architecture for ResourceProvider, ResourceLayout, ResourceTable, ResourceGrid, ResourcePagination, useResourceContext, useResourceQuery, useResourceMutations, and module structure. Use when the user mentions resource pages, CRUD views, data tables, grid views, or module patterns for catalog/settings entities.
---

# Frontend Resource Pattern (Compound Component Architecture)

This skill describes the **compound component architecture** used to build resource CRUD pages in the dashboard app. Every new resource module MUST follow this pattern.

## Architecture Overview

The resource system is built on the **Compound Component Pattern** using React Context. Each resource page composes independent, swappable pieces that share state through a provider.

**Core Principle:** Any part must be usable standalone, and any part must be replaceable. Table view can be swapped for grid view, layout can be customized, and hooks can be used independently.

### SOLID Compliance

| Principle | How It's Applied |
|---|---|
| **S** — Single Responsibility | Each hook (`useResourceQuery`, `useResourceMutations`), each component (`ResourceTable`, `ResourceGrid`, `ResourcePagination`), and each module file has one job |
| **O** — Open/Closed | Views are extensible without modifying the provider. Add a new view type by creating a component that calls `useResourceContext()` |
| **L** — Liskov Substitution | `ResourceTable` and `ResourceGrid` are interchangeable within `ResourceLayout` children |
| **I** — Interface Segregation | `useResourceQuery` provides only query data. `useResourceMutations` provides only mutations. Consumers pick what they need |
| **D** — Dependency Inversion | Components depend on the `ResourceContext` abstraction, not concrete implementations |

---

## File Structure

### Shared Infrastructure: `apps/dashboard/shared/data-view/resource/`

| File | Role |
|---|---|
| `types.ts` | All shared types: `ResourceContext`, `ResourceItem`, `ResourceColumns`, `UseResourceOptions`, etc. |
| `resource-context.tsx` | `ResourceProvider` (context provider) + `useResourceContext()` hook |
| `use-resource-query.ts` | `useResourceQuery()` — focused hook for data fetching, pagination, sorting |
| `use-resource-mutations.ts` | `useResourceMutations()` — focused hook for delete mutation |
| `resource-layout.tsx` | `ResourceLayout` + `ResourcePageHeader` — page title (accent bar, no divider) |
| `resource-list-page.tsx` | `ResourceListPage` — built-in or custom toolbar + content slot |
| `resource-page.tsx` | `ResourcePage` — layout + list page composition |
| `resource-toolbar.tsx` | `ResourceToolbar` with `.Start` / `.Center` / `.End` slots |
| `resource-search.tsx` | Debounced search input wired to context |
| `resource-filter.tsx` | Filter panel trigger wired to context |
| `resource-form-dialog.tsx` | Create/edit dialog + add button |
| `generate-resource.tsx` | `generateResource()` namespace factory |
| `resource-table.tsx` | `ResourceTable` — table view (reads from context) |
| `resource-grid.tsx` | `ResourceGrid` — card grid view component (reads from context) |
| `resource-pagination.tsx` | `ResourcePagination` — standalone pagination (reads from context) |
| `index.ts` | Barrel exports for all components, hooks, and types |

### Legacy Files (backward-compatible, still exported)

| File | Role |
|---|---|
| `resource.tsx` | Legacy `Resource` render-prop component |
| `resource-page.tsx` | Legacy `ResourcePage` monolithic component |
| `resource-table-view.tsx` | Legacy `ResourceTableView` |
| `use-resource.ts` | Legacy `useResource` hook (monolithic) |

### Shared Infrastructure: `apps/dashboard/shared/data-view/table-view/`

| File | Role |
|---|---|
| `data-table.tsx` | Card-style `DataTable` — loading skeletons, empty state, row hover |
| `column-header.tsx` | Sortable header with tooltips + i18n dropdown menu |
| `boolean-cell.tsx` | `BooleanCell` — active/inactive status badge |
| `actions-column.tsx` | `createActionsColumn()` — row edit/delete menu with tooltips |
| `data-view-pagination.tsx` | Pagination footer with i18n + nav tooltips |
| `index.ts` | Barrel exports |

### Shared helpers

| File | Role |
|---|---|
| `shared/components/icon-tooltip.tsx` | `IconTooltip` — reusable tooltip wrapper for icon buttons |

---

## How to Create a New Resource Module

### Step-by-step (using Units as reference)

#### 1. Create the module directory

```
apps/dashboard/modules/<resource-name>/
├── <resource-name>.config.ts          # Schema, defaults, mappers (pure TS, no JSX)
├── components/
│   ├── <resource-name>-columns.tsx     # Column definitions (uses JSX for headers)
│   ├── <resource-name>-page.tsx       # Page composition (compound pattern)
│   ├── <resource-name>-form.tsx       # Create/Edit form
│   └── <resource-name>-card.tsx      # Grid view card (optional)
├── hooks/
│   ├── use-<resource-name>-resource.ts # Pre-typed context hook
│   └── index.ts
└── index.ts                           # Barrel exports
```

#### 2. Create the config file (`units.config.ts`)

This is **pure TypeScript** — no JSX, no React imports. Contains:

- **Zod schema** for form validation
- **Form values type** inferred from the schema
- **Default form values** constant
- **API-to-form mapper** function (`mapUnitToFormValues`)

```ts
import { z } from "zod"

export const unitFormSchema = z.object({
    name: z.string().trim().min(1, "Name is required"),
    abbreviation: z.string().trim().min(1, "Abbreviation is required"),
    isActive: z.boolean().optional(),
})

export type UnitFormValues = z.infer<typeof unitFormSchema>

export const DEFAULT_UNIT_FORM_VALUES: UnitFormValues = {
    name: "",
    abbreviation: "",
    isActive: true,
}

export function mapUnitToFormValues(data: unknown): UnitFormValues {
    const resolved = (data && typeof data === "object" && "data" in data
        ? (data as { data?: Partial<UnitFormValues> }).data
        : data) as Partial<UnitFormValues> | null | undefined

    return {
        name: resolved?.name ?? "",
        abbreviation: resolved?.abbreviation ?? "",
        isActive: resolved?.isActive ?? true,
    }
}
```

#### 3. Create the columns definition (`components/units-columns.tsx`)

This file contains JSX (`<ColumnHeader>`) so it MUST be `.tsx`:

```tsx
import type { ColumnDef } from "@tanstack/react-table"
import type { UnitsClient } from "@core/api-client"
import type { ResourceItem, ResourceTableHelpers } from "@/shared/data-view/resource"
import { ColumnHeader, BooleanCell } from "@/shared/data-view/table-view"

export function createUnitsColumns(
    helpers: ResourceTableHelpers<UnitsClient>,
): ColumnDef<ResourceItem<UnitsClient>>[] {
    return [
        {
            accessorKey: "name",
            header: ({ column }) => <ColumnHeader column={column} title="Name" />,
        },
        {
            accessorKey: "abbreviation",
            header: ({ column }) => <ColumnHeader column={column} title="Abbreviation" />,
        },
        {
            accessorKey: "isActive",
            header: ({ column }) => <ColumnHeader column={column} title="Active" />,
            cell: ({ row }) => <BooleanCell value={row.getValue("isActive") as boolean} />,
        },
        helpers.actionsColumn(),
    ]
}
```

#### 4. Create the page component (`components/units-page.tsx`)

Preferred: **`generateResource`** shorthand (see `units.resource.ts`):

```tsx
"use client"

import { UnitsResource } from "../units.resource"
import { UnitsForm } from "./units-form"
import { createUnitsColumns } from "./units-columns"

export function UnitsPage() {
    return (
        <UnitsResource>
            <UnitsResource.Page
                title="Units"
                actions={
                    <UnitsResource.FormDialog
                        title={(it) => (it?.id ? it.name : "Add unit")}
                        form={UnitsForm}
                    />
                }
            >
                <UnitsResource.Table columns={createUnitsColumns} />
            </UnitsResource.Page>
        </UnitsResource>
    )
}
```

**Default toolbar** (no `toolbar` prop): Filter (start) · Search (center) · `actions` (end).

**Custom toolbar** with debounced search + filter panel:

```tsx
<UnitsResource.Page
    title="Units"
    toolbar={
        <UnitsResource.Toolbar>
            <UnitsResource.Toolbar.Start>
                <UnitsResource.Filter />
            </UnitsResource.Toolbar.Start>
            <UnitsResource.Toolbar.Center>
                <UnitsResource.Search />
            </UnitsResource.Toolbar.Center>
        </UnitsResource.Toolbar>
    }
    actions={<UnitsResource.FormDialog title={...} form={UnitsForm} />}
>
    <UnitsResource.Table columns={createUnitsColumns} />
</UnitsResource.Page>
```

`ResourceListPage` merges `actions` into `Toolbar.End` automatically.

Alternative: explicit `ResourceProvider` + `ResourceLayout` (see composition diagram below).

#### 5. Create the form component (`components/units-form.tsx`)

The form imports schema/defaults/mappers from the config file and uses `useResourceForm` + `useFormMutation`:

```tsx
"use client"

import { useApi } from "@/shared/useApi"
import { unitResource } from "@core/api-contracts"
import type { CreateUnitDto, UpdateUnitDto } from "@core/api-contracts"
import { Rhform, RhfTextField, RhfCheckboxField } from "@/shared/components/form"
import { useFormDialog } from "@/shared/components/form-dialog"
import { useFormMutation } from "@/shared/hooks/use-form-mutation"
import { useResourceForm } from "@/shared/hooks/use-resource-form"
import {
    unitFormSchema,
    DEFAULT_UNIT_FORM_VALUES,
    mapUnitToFormValues,
    type UnitFormValues,
} from "../units.config"

export function UnitsForm({ resourceId, initialData, onSuccess, paramKey }) {
    const api = useApi()
    const { close } = useFormDialog(paramKey)

    const { form, isEditing, isInitializing } = useResourceForm<UnitFormValues, unknown>({
        schema: unitFormSchema,
        defaultValues: DEFAULT_UNIT_FORM_VALUES,
        resourceId,
        initialize: (id) => api.units.show(id),
        initialData,
        queryKey: [unitResource.routes.show, resourceId],
        mapToFormValues: mapUnitToFormValues,
    })

    const { mutate, error, isPending } = useFormMutation(form, {
        mutationFn: (values) => { /* create or update */ },
        onSuccess: () => { form.reset(DEFAULT_UNIT_FORM_VALUES); close(); onSuccess?.() },
    })
    // ...render form fields
}
```

#### 6. Create the typed hook (`hooks/use-units-resource.ts`)

```ts
import type { UnitsClient } from "@core/api-client"
import type { ResourceContext } from "@/shared/data-view/resource"
import { useResourceContext } from "@/shared/data-view/resource"

export type UnitsResourceContext = ResourceContext<UnitsClient>

export function useUnitsResource(): UnitsResourceContext {
    return useResourceContext<UnitsClient>()
}
```

#### 7. Create barrel export (`index.ts`)

```ts
export { UnitsPage } from "./components/units-page"
export { UnitsForm } from "./components/units-form"
export { UnitCard } from "./components/unit-card"
export { createUnitsColumns } from "./components/units-columns"
export { useUnitsResource } from "./hooks"
export type { UnitsResourceContext } from "./hooks"
export { unitFormSchema, DEFAULT_UNIT_FORM_VALUES, mapUnitToFormValues } from "./units.config"
export type { UnitFormValues } from "./units.config"
```

#### 8. Wire the route page

```tsx
// apps/dashboard/app/(authenticated)/catalog/units/page.tsx
import { UnitsPage } from "@/modules/units"

export default function Page() {
    return <UnitsPage />
}
```

---

## Swapping Views

The compound pattern makes it trivial to swap the data view. Instead of `ResourceTable`, use `ResourceGrid`:

```tsx
<ResourceProvider<UnitsClient> getClient={(api) => api.units} routeKey="units">
    <ResourceLayout title="Units" headerProps={{ actions: <UnitsHeaderActions /> }}>
        {/* Table view */}
        <ResourceTable<UnitsClient> columns={createUnitsColumns} />

        {/* OR: Grid view */}
        <ResourceGrid<ResourceItem<UnitsClient>>
            keyExtractor={(item) => String(item.id)}
        >
            {(item) => <UnitCard unit={item} onEdit={resource.openEdit} />}
        </ResourceGrid>
    </ResourceLayout>
</ResourceProvider>
```

Any custom view can be created by calling `useResourceContext()` directly:

```tsx
function CustomView() {
    const { items, isLoading, pagination, handleChange } = useResourceContext<UnitsClient>()
    // render anything
}
```

---

## Using Hooks Independently

The focused hooks can be used outside the provider for advanced cases:

```ts
import { useResourceQuery } from "@/shared/data-view/resource"
import { useResourceMutations } from "@/shared/data-view/resource"

// Just query data (no provider needed)
const { items, isLoading, invalidateQuery } = useResourceQuery({
    getClient: (api) => api.units,
    routeKey: "units",
})

// Just mutations (pass client + invalidation callback)
const { deleteItem } = useResourceMutations(api.units, { invalidateQuery })
```

---

## Key Type Exports

From `@/shared/data-view/resource`:

| Type | Purpose |
|---|---|
| `ResourceContext<TClient>` | Full context shape available via `useResourceContext<TClient>()` |
| `ResourceItem<TClient>` | Inferred list item type (`CrudListDataItem<TClient>`) |
| `ResourceColumns<TClient>` | Column definitions (array or function with helpers) |
| `ResourceTableHelpers<TClient>` | `{ actionsColumn, openEdit, deleteItem }` helpers |
| `UseResourceOptions<TClient>` | Config for `ResourceProvider` / `useResourceQuery` |
| `ResourceProviderProps<TClient>` | Props for `ResourceProvider` |
| `ResourceLayoutProps<TClient>` | Props for `ResourceLayout` |
| `ResourceTableProps<TClient>` | Props for `ResourceTable` |
| `ResourceGridProps<TItem>` | Props for `ResourceGrid` |

---

## Component Composition Diagram

### Preferred (`generateResource`)

```
<UnitsResource>                           ← generateResource provider + namespace
  <UnitsResource.Page title="...">        ← ResourceLayout + ResourceListPage
    [toolbar: Filter · Search · actions]    ← built-in or Resource.Toolbar slots
    <UnitsResource.Table columns={...} /> ← DataTable via context
  </UnitsResource.Page>
</UnitsResource>
```

### Explicit provider (custom layouts)

```
<ResourceProvider<TClient>
    getClient={(api) => api.xxx}
    paramKey="xxx"
>
    <ResourceLayout title="...">          ← ResourcePageHeader (no divider)
        <ResourceListPage actions={...}>  ← toolbar row
            <ResourceTable<TClient> />    ← table view
        </ResourceListPage>
    </ResourceLayout>
</ResourceProvider>
```

---

## UI Conventions (resource + table)

- **Page title:** `ResourcePageHeader` — primary accent bar, semibold title, **no** header divider.
- **Toolbar:** 3-column grid — start (filter) · center (search) · end (create/`actions`).
- **Search:** `ResourceSearch` debounces to context; primary focus ring on input.
- **Table:** card container, muted header row, row hover, i18n empty state.
- **Columns:** `ColumnHeader` for sort; `BooleanCell` for booleans; `helpers.actionsColumn()` for row menu.
- **Tooltips:** `IconTooltip` on icon-only controls (clear search, pagination, row menu).
- **Theme:** use design tokens (`primary`, `card`, `muted`, `border`) — no hardcoded colors in modules.
- **i18n:** `system.dataView`, `system.booleanCell`, `system.resourceSearch`, etc. in all locale files.

---

## Important Rules

1. **Config files (`.ts`) must not contain JSX** — they hold schemas, types, defaults, and pure mappers only
2. **Column definitions must be `.tsx`** — they use `<ColumnHeader>` JSX
3. **Always type the provider with the specific client** — `ResourceProvider<UnitsClient>`, not `ResourceProvider<any>`
4. **Forms import from their sibling config** — `useResourceForm` takes the schema and mappers from `*.config.ts`
5. **The route page file must be a thin wrapper** — it only imports and renders the module's page component
6. **Never access the context outside `ResourceProvider`** — `useResourceContext()` will throw if used without a provider
7. **For standalone data access without UI**, use `useResourceQuery` and `useResourceMutations` directly instead of the provider
8. **When adding a new resource**, you MUST also add the API client and resource definition first (see api-contracts and api-client skills)
9. **Use `generateResource` + `Resource.Page`** for new modules unless a custom layout requires explicit `ResourceProvider`
10. **Put the create button in `actions`**, not in the title row — it renders in the toolbar end column
11. **Use `BooleanCell` for boolean columns** — never display raw `true`/`false` in tables
12. **Extend `shared/data-view/` for UI changes** — do not restyle tables or toolbars inside `modules/`
13. **Type generics with `ICrudClient`**, not `any`; optional context: `ResourceContext<TClient> | undefined`