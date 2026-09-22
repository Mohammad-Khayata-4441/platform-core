---
name: project-map
description: Maps the ERP monorepo structure, packages, API domains, dashboard routes, and where each layer lives. Use when exploring the codebase, locating files, understanding architecture, or answering where a feature belongs.
---

# ERP Project Map

## Quick orientation
1. Read [reference.md](reference.md) for directory tree, package roles, and route status.
2. Trace the vertical slice: **Prisma → api-contracts → API module → api-client → dashboard module → App Router page**.
3. Match API domain in `apps/api/src/modules/` to nav href in `apps/dashboard/config/navGroups.tsx`.

## Workspace packages
| Package | Path | Purpose |
|---------|------|---------|
| `@core/db-prisma` | `packages/db-prisma` | Schema, migrations, seed |
| `@core/api-contracts` | `packages/api-contracts` | Resources + DTOs |
| `@core/api-client` | `packages/api-client` | HTTP clients |
| `@core/backend-core` | `packages/backend-core` | Nest CRUD infrastructure |
| `@core/ui` | `packages/ui` | Shared UI |

## Apps
| App | Package | Path |
|-----|---------|------|
| Dashboard | `@core/dashboard` | `apps/dashboard` |
| API | `@core/api` | `apps/api` |
| Desktop | — | `apps/desktop` |

## API domains (`apps/api/src/modules/`)
| Domain | Resources (examples) |
|--------|---------------------|
| `identity/` | auth, tenants, users, roles |
| `catalog/` | units, items, item-categories |
| `inventory/` | warehouses, stock-ledger, stock-counts |
| `invoicing/` | invoices, invoice-types, payments, cashboxes |
| `accounting/` | accounts, currencies, fiscal-periods, document-sequences |
| `parties/` | customers/suppliers |
| `reports/` | dashboard metrics |
| `audit/`, `ai-chat/` | audit logs, AI chat |

## Dashboard feature modules (implemented)
| Module | Route | API client |
|--------|-------|------------|
| `modules/units/` | `/catalog/units` | `api.units` |
| `modules/item-categories/` | `/catalog/categories` | `api.categories` |
| `modules/home/` | `/` | reports/dashboard |
| `modules/auth/` | `/login` | `api.auth` |

Many routes in `config/navGroups.tsx` are **planned** — only implement pages that exist under `app/[locale]/(authenticated)/`.

## Shared dashboard systems
| Path | Role |
|------|------|
| `shared/data-view/resource/` | `generateResource`, `Resource.Page`, toolbar (Start/Center/End), search, filter, form dialog |
| `shared/data-view/table-view/` | `DataTable`, `ColumnHeader`, `BooleanCell`, `createActionsColumn`, pagination |
| `shared/data-view/filter/` | Filter panel for `Resource.Filter` |
| `shared/components/icon-tooltip.tsx` | `IconTooltip` for icon-only controls |
| `shared/components/form/` | RHF fields + zod |
| `shared/useApi.ts` | `useApi()` |

## Layer skills (detailed procedures)
| Task | Skill |
|------|-------|
| Resource + DTO | `api-contracts` |
| HTTP client | `api-client` |
| NestJS module | `backend-resource-module` |
| Dashboard CRUD UI | `frontend-resource-pattern` |
| Full-stack checklist | `add-crud-feature` |

## Golden vertical slice
**Units:** `packages/db-prisma` → `unit.resource.ts` → `modules/catalog/units/` → `units.client.ts` → `modules/units/` → `catalog/units/page.tsx`
