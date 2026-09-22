---
name: feature-scaffold
description: >-
  Scaffold a complete ERP feature with folder structure, Prisma model, api-contracts
  resource, NestJS module, api-client, and dashboard module. Use when creating a new
  entity, module, or full CRUD feature from scratch. Complements add-crud-feature with
  a concrete file map and naming conventions.
---

# Feature Scaffold Generator (ERP)

Generate a complete feature structure across the monorepo stack.
Read **`add-crud-feature`** checklist and **`project-map`** before generating.

## Required information

Gather from user (or infer from codebase):

1. **Entity name** (singular, PascalCase model — e.g. `Unit`, `ItemCategory`)
2. **Plural route/API key** (e.g. `units`, `item-categories`)
3. **API domain** (`identity`, `catalog`, `inventory`, `invoicing`, `accounting`, `parties`, …)
4. **Dashboard route** (e.g. `/catalog/units`)
5. **Fields** (name, types, relations, tenant-scoped?)
6. **Pages needed** (list + form dialog default; full page form if complex)

## Golden reference

Copy file-by-file from **units**:

```
packages/db-prisma/src/schema/unit.prisma
packages/api-contracts/src/resources/unit.resource.ts
apps/api/src/modules/catalog/units/
packages/api-client/src/clients/units.client.ts
apps/dashboard/modules/units/
apps/dashboard/app/[locale]/(authenticated)/catalog/units/page.tsx
```

## Folder structure to generate

### 1. Database (`packages/db-prisma`)

```
src/schema/<entity>.prisma     ← model + @@map, tenantId if multi-tenant
```

Run: `pnpm --filter @core/db-prisma db:migrate:dev`

### 2. API contracts (`packages/api-contracts`)

```
src/resources/<entity>.resource.ts   ← defineCrudResource
src/dto/<entity>.dto.ts              ← Create, Update, Response DTOs (Zod)
src/resources/index.ts               ← register in resources map
src/dto/index.ts                     ← export DTOs
```

### 3. NestJS API (`apps/api`)

```
src/modules/<domain>/<entities>/
├── controllers/<entity>.controller.ts
├── services/<entity>.service.ts
├── repositories/<entity>.repository.ts
├── presenters/<entity>.presenter.ts
├── dto/                              ← class-validator + @ApiProperty
├── events/
└── <entity>.module.ts
```

Register in domain module + `app.module.ts` if new domain.

### 4. API client (`packages/api-client`)

```
src/clients/<entities>.client.ts
src/clients/index.ts
src/api.ts                            ← createApi() registration
```

### 5. Dashboard (`apps/dashboard`)

```
modules/<entities>/
├── <entities>.resource.ts            ← generateResource()
├── <entities>.config.ts              ← Zod schema, defaults, mappers
├── <entities>.page.tsx               ← Resource.Page + Table
├── <entities>.form.tsx               ← FormDialog fields
├── <entities>.columns.tsx            ← ColumnHeader, BooleanCell, actions
└── index.ts

app/[locale]/(authenticated)/<path>/page.tsx   ← thin import only
config/navGroups.tsx                           ← nav entry
messages/en.json, ar.json, tr.json             ← feature + system.* keys
```

## Naming conventions

| Item | Convention | Example |
|------|------------|---------|
| Prisma model | PascalCase singular | `Unit` |
| API path | kebab-case plural | `/units` |
| Resource key | `resources.units.key` | from api-contracts |
| Dashboard module | plural folder | `modules/units/` |
| i18n namespace | camelCase feature key | `units.title` |

## Key patterns to enforce

- DTOs defined once in **api-contracts** — never duplicate in dashboard
- NestJS: repository only for Prisma; presenter for responses
- Swagger: complete `@ApiProperty` on every DTO field (see `.ai/rules/api.md`)
- Dashboard: `generateResource` + thin `page.tsx`
- i18n: all user strings in `messages/*.json` (en, ar, tr)
- RTL: logical CSS (`start`/`end`)

## After scaffold

1. Write spec if non-trivial: `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
2. Run builds:
   ```bash
   pnpm turbo run build --filter=@core/api
   pnpm turbo run build --filter=@core/dashboard
   ```
3. Smoke test: list / create / edit / delete in UI
4. If API DTOs added: `pnpm generate:dev` with API running

## Related skills

| Layer | Skill |
|-------|-------|
| Full checklist | `add-crud-feature` |
| Contracts only | `api-contracts` |
| API module | `backend-resource-module` |
| Client | `api-client` |
| Dashboard list | `dashboard-resource-page`, `frontend-resource-pattern` |
| Forms | `dashboard-form` |
