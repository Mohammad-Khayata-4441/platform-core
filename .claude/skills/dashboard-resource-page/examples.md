# Dashboard Resource Examples

## Minimal page (recommended — built-in toolbar)

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

Layout: **Filter · Search (center) · Add button (end)** — provided by `ResourceListPage` when `toolbar` is omitted.

## Custom toolbar (filter + debounced search)

```tsx
export function CategoriesPage() {
  return (
    <CategoriesResource>
      <CategoriesResource.Page
        title="الفئات"
        toolbar={
          <CategoriesResource.Toolbar>
            <CategoriesResource.Toolbar.Start>
              <CategoriesResource.Filter />
            </CategoriesResource.Toolbar.Start>
            <CategoriesResource.Toolbar.Center>
              <CategoriesResource.Search />
            </CategoriesResource.Toolbar.Center>
          </CategoriesResource.Toolbar>
        }
        actions={
          <CategoriesResource.FormDialog
            title={(it) => (it?.id ? it.name : "إضافة فئة")}
            form={CategoriesForm}
          />
        }
      >
        <CategoriesResource.Table columns={createCategoriesColumns} />
      </CategoriesResource.Page>
    </CategoriesResource>
  )
}
```

`actions` is auto-merged into `Toolbar.End`.

## Thin route page

```tsx
// app/[locale]/(authenticated)/catalog/units/page.tsx
import { UnitsPage } from "@/modules/units"

export default function Page() {
  return <UnitsPage />
}
```

## Columns with BooleanCell and actions

```tsx
import { ColumnHeader, BooleanCell } from "@/shared/data-view/table-view"

export function createCategoriesColumns(
  helpers: ResourceTableHelpers<CategoriesClient>,
): ColumnDef<ResourceItem<CategoriesClient>>[] {
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

## Resource config

```ts
export const UnitsResource = generateResource<UnitsClient>({
  getClient: (api) => api.units,
  paramKey: "units",
  list: {
    searchIn: ["name", "abbreviation"],
    defaultSort: { field: "name", order: "asc" },
  },
})
```

## More patterns
`apps/dashboard/shared/data-view/resource/REFACTOR_EXAMPLES.md`
