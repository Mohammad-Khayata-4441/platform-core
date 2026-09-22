---
name: dashboard-resource-page
description: Builds or modifies dashboard CRUD list pages using generateResource, Resource.Page, Table, FormDialog, and columns. Use for catalog pages, data tables, entity forms, or modules/units-like features.
---

# Dashboard Resource Page

## Preferred pattern: `generateResource`

```tsx
// modules/units/units.resource.ts
export const UnitsResource = generateResource<UnitsClient>({
  getClient: (api) => api.units,
  paramKey: "units",
  list: { searchIn: ["name", "abbreviation"], defaultSort: { field: "name", order: "asc" } },
})
```

## Standard page (recommended)

Uses the **built-in toolbar** — no custom `toolbar` prop needed:

```tsx
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

**Built-in toolbar layout:** Filter (start) · Search (center) · `actions` / create button (end).

## Custom toolbar (filters + debounced search)

Use when you need explicit control (e.g. filter panel + `Resource.Search`):

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

`ResourceListPage` injects `actions` into `Toolbar.End` automatically via `cloneElement`.

## Module file layout
```
modules/<feature>/
├── <feature>.resource.ts       # generateResource<Client>
├── <feature>.config.ts         # zod, defaults, mapXToFormValues (no JSX)
├── components/
│   ├── <feature>-page.tsx
│   ├── <feature>-form.tsx
│   └── <feature>-columns.tsx   # ColumnHeader, BooleanCell, helpers.actionsColumn()
├── hooks/use-<feature>-resource.ts
└── index.ts
```

## Columns

```tsx
import { ColumnHeader, BooleanCell } from "@/shared/data-view/table-view"

export function createUnitsColumns(helpers: ResourceTableHelpers<UnitsClient>) {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => <ColumnHeader column={column} title="Name" />,
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

## Shared UI (do not duplicate in modules)

| Need | Import from |
|------|-------------|
| Table shell | `@/shared/data-view/table-view` → `DataTable` (via `Resource.Table`) |
| Sort headers | `ColumnHeader` |
| Boolean/status | `BooleanCell` |
| Icon tooltips | `@/shared/components/icon-tooltip` → `IconTooltip` |
| Toolbar slots | `Resource.Toolbar.Start` / `.Center` / `.End` |
| Page title shell | `ResourceLayout` / `ResourcePageHeader` (no header divider) |

## Steps
1. Ensure `*Client` exists in `@core/api-client` and is on `createApi()`.
2. Create `*.resource.ts` with `generateResource<Client>`.
3. Create `*.config.ts` — schema, `DEFAULT_*_FORM_VALUES`, `map*ToFormValues`.
4. Create columns factory with `ColumnHeader`, `BooleanCell` where needed, `helpers.actionsColumn()`.
5. Compose page with `Resource.Page`, `actions` (`FormDialog`), `Resource.Table`.
6. Form: `useResourceForm` + `useFormMutation`, call `api.{client}.create/update`.
7. Route page: `export default () => <XPage />` only.
8. Add i18n keys under `system.*` if introducing new user-facing strings.

## i18n keys (resource/table)
| Namespace | Used for |
|-----------|----------|
| `system.resourceSearch` | Search placeholder, clear |
| `system.resourceFilter` | Filter button, panel labels |
| `system.resourcePagination` | Page summary, rows per page |
| `system.dataView` | Empty state, sort menu, pagination tooltips |
| `system.booleanCell` | Active / inactive badges |
| `system.tableActions` | Row action menu |

## Alternative: explicit `ResourceProvider`
For fully custom layouts, use `ResourceProvider` + `ResourceLayout` + `ResourceTable` directly. See skill `frontend-resource-pattern`.

## Rules
- Never put logic in `app/**/page.tsx`
- `*.config.ts` must not import React/JSX
- Type provider: `generateResource<UnitsClient>` not `any`
- `useResourceContext()` only inside provider tree
- Put create button in `actions`, not duplicated in `headerActions`
- Extend shared `data-view/*` for UI changes — not per-module table styling

## Examples
See [examples.md](examples.md).

## Reference
`apps/dashboard/modules/units/`, `apps/dashboard/modules/categories/`
