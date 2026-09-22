---
name: dashboard
description: Dashboard Next.js routing, module structure, and resource UI conventions. Load when editing apps/dashboard/**.
scope: apps/dashboard/**
---

# Dashboard (Next.js) — Rules

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

## Table & column conventions
- Use `ColumnHeader` for sortable headers (tooltips + i18n sort menu)
- Use `BooleanCell` for boolean columns — never render raw `true`/`false`
- Use `helpers.actionsColumn()` for row edit/delete menu
- Do **not** restyle tables in module files — extend `shared/data-view/table-view/` instead

## i18n + RTL
- User strings → `messages/*.json` + `useTranslations()`
- Resource/table strings live under `system.*`: `resourceSearch`, `resourceFilter`, `resourcePagination`, `dataView`, `booleanCell`, `tableActions`
- Nav: `config/navGroups.tsx` (`titleKey`, `labelKey`)
- RTL: logical CSS (`start`/`end`); avoid hardcoded `left`/`right`

## Config files
`*.config.ts` — Zod schema, defaults, mappers only (no JSX). Columns in `*.tsx`.

## Typing
- Generic default: `ICrudClient`, not `any`
- `useResourceContext()` only inside provider tree

## Relational fields in forms
- `RhfResourceSelect` for FK fields stores the selected object, never just the ID string
- **Field name:** drop the `Id` suffix — `invoiceType` not `invoiceTypeId`
- **Schema:** `z.object({ id: z.string() }).passthrough().nullable()` for each field; export `type XRelationalField = { id: string }` as the `TValue` generic; validate required fields via `superRefine` on the parent schema (avoids Zod v4 type-narrowing issues with `.refine()`)
- **Component:** use concrete client types and `getValue={(it) => it}` — never `any`:
  ```tsx
  <RhfResourceSelect<TValues, "field", SpecificClient, RelationalField>
      client={(api) => api.theClient}
      getLabel={(it) => it.name}   // TypeScript knows the shape from OpenAPI types
      getValue={(it) => it}         // stores the full item; field type is { id: string } which is structurally satisfied
  />
  ```
- **DTO mapper:** extract `.id` on submit — `values.invoiceType?.id ?? ""`
- **Edit mode:** populate with `{ id }` minimal objects; combobox syncs the label from loaded options automatically
