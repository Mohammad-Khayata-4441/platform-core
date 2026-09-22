---
description: Dashboard Next.js routing, modules, and resource UI conventions
globs: apps/dashboard/**
alwaysApply: false
---

# Dashboard (Next.js)

## Routing
- App Router: `app/[locale]/`
- `(authenticated)/` — protected; `(auth)/` — login
- `@breadcrumbs/` — parallel route for breadcrumb slots
- **Thin pages:** `page.tsx` only imports from `@/modules/<feature>`

## Folder roles
| Path | Purpose |
|------|---------|
| `modules/<feature>/` | Page, form, columns, `*.resource.ts`, `*.config.ts` |
| `shared/data-view/resource/` | Compound CRUD page shell (provider, layout, toolbar, table) |
| `shared/data-view/table-view/` | Shared `DataTable`, `ColumnHeader`, `BooleanCell`, pagination |
| `shared/data-view/filter/` | Filter panel used by `Resource.Filter` |
| `shared/components/` | UI primitives, `IconTooltip`, forms |
| `infrastructure/` | Layout, providers, auth |
| `config/` | `navGroups.tsx` |
| `messages/` | i18n (`en.json`, `ar.json`, `tr.json`) via next-intl |

## CRUD list pages
Use `generateResource<Client>()` from `@/shared/data-view/resource`. Golden reference: `modules/units/`.

**Minimal page composition:**
```tsx
<UnitsResource>
  <UnitsResource.Page title="Units" actions={<UnitsResource.FormDialog ... />}>
    <UnitsResource.Table columns={createUnitsColumns} />
  </UnitsResource.Page>
</UnitsResource>
```

**Default toolbar layout** (when `toolbar` prop is omitted): Filter (start) · Search (center) · Create/`actions` (end).

**Custom toolbar** — use 3-column slots; pass create button via `actions` (auto-merged into `Toolbar.End`):
```tsx
toolbar={
  <UnitsResource.Toolbar>
    <UnitsResource.Toolbar.Start><UnitsResource.Filter /></UnitsResource.Toolbar.Start>
    <UnitsResource.Toolbar.Center><UnitsResource.Search /></UnitsResource.Toolbar.Center>
  </UnitsResource.Toolbar>
}
actions={<UnitsResource.FormDialog ... />}
```

## Table & column conventions
- Use `ColumnHeader` for sortable headers (tooltips + i18n sort menu).
- Use `BooleanCell` for `isActive` / boolean columns — never render raw `true`/`false`.
- Use `helpers.actionsColumn()` for row edit/delete menu.
- Reuse `IconTooltip` from `@/shared/components/icon-tooltip` for icon-only controls.
- Do **not** restyle tables in module files — extend `shared/data-view/table-view/` instead.

## Page header
- `ResourceLayout` / `Resource.Page` title uses `ResourcePageHeader` (primary accent bar, no divider).
- Keep create actions in toolbar `actions`, not in the title row, unless using `headerActions`.

## i18n + RTL
- User strings → `messages/*.json` + `useTranslations()`
- Resource/table strings live under `system.*`: `resourceSearch`, `resourceFilter`, `resourcePagination`, `dataView`, `booleanCell`, `tableActions`
- Nav: `config/navGroups.tsx` (`titleKey`, `labelKey`)
- RTL: logical CSS (`start`/`end`, `inset-s`/`inset-e`); avoid hardcoded `left`/`right`

## Config files
`*.config.ts` — Zod schema, defaults, mappers only (no JSX). Columns in `*.tsx`.

## Typing
- Generic default: `ICrudClient`, not `any`
- Optional context in list page: `ResourceContext<TClient> | undefined`
