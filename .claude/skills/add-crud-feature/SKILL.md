---
name: add-crud-feature
description: Adds a full-stack CRUD feature across Prisma, api-contracts, NestJS API, api-client, and dashboard. Use when adding a new entity, resource, API module, or catalog/settings CRUD page.
---

# Add CRUD Feature (Full Stack)

Follow layers **in order**. Use **units** as the golden reference.

## Checklist
Copy [checklist.md](checklist.md) and mark items as you go.

## Layer order

### 1. Database
- Add model in `packages/db-prisma/src/schema/<entity>.prisma`
- Run `pnpm --filter @core/db-prisma db:migrate:dev`
- Update seed if needed (`src/seed/index.ts`)

**Rule:** `.ai/rules/database.md`

### 2. API contracts
- `packages/api-contracts/src/resources/<entity>.resource.ts` — `defineCrudResource`
- `packages/api-contracts/src/dto/<entity>.dto.ts`
- Register in `src/resources/index.ts` (`resources` map) and `src/dto/index.ts`

**Skill:** `api-contracts`

### 3. NestJS API
- Create `apps/api/src/modules/<domain>/<entities>/` (4 layers)
- Register in domain module + `app.module.ts` if new domain

**Skill:** `backend-resource-module`  
**Reference:** `apps/api/src/modules/catalog/units/`

### 4. API client
- `packages/api-client/src/clients/<entities>.client.ts`
- Register in `clients/index.ts` and `api.ts` `createApi()`

**Skill:** `api-client`

### 5. Dashboard module
- `apps/dashboard/modules/<entities>/` — resource, config, page, form, columns
- Thin route: `app/[locale]/(authenticated)/<path>/page.tsx`
- Nav: `config/navGroups.tsx`
- i18n: `messages/en.json`, `ar.json`, `tr.json` (`system.*` keys for resource/table UI)

**Page pattern:** `generateResource` → `Resource.Page` (title + `actions`) → `Resource.Table`. Built-in toolbar: Filter · Search · Add.

**Columns:** `ColumnHeader`, `BooleanCell` for booleans, `helpers.actionsColumn()`. UI changes go in `shared/data-view/`, not modules.

**Skills:** `dashboard-resource-page`, `frontend-resource-pattern`  
**Reference:** `apps/dashboard/modules/units/`, `apps/dashboard/modules/categories/`

### 6. Verify
```bash
pnpm --filter @core/api dev
pnpm --filter @core/dashboard dev
```
- List/create/update/delete via UI
- Swagger documents the new routes

## Golden paths
| Layer | Path |
|-------|------|
| Prisma | `packages/db-prisma/src/schema/unit.prisma` |
| Contracts | `packages/api-contracts/src/resources/unit.resource.ts` |
| API | `apps/api/src/modules/catalog/units/` |
| Client | `packages/api-client/src/clients/units.client.ts` |
| Dashboard | `apps/dashboard/modules/units/` |
| Page | `apps/dashboard/app/[locale]/(authenticated)/catalog/units/page.tsx` |

## Common mistakes
- Skipping api-contracts and duplicating types in API/dashboard
- Hardcoding resource key instead of `resources.{name}.key`
- Fat `page.tsx` with business logic (belongs in `modules/`)
- Forgetting `navGroups` + i18n keys
