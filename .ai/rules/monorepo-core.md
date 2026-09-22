---
description: ERP monorepo core architecture, commands, and cross-cutting rules
alwaysApply: true
---

# ERP Monorepo

## Stack
- **Orchestration:** Turborepo + pnpm workspaces (`apps/*`, `packages/*`)
- **Frontend:** Next.js App Router → `apps/dashboard` (`@core/dashboard`)
- **Backend:** NestJS → `apps/api` (`@core/api`)
- **Database:** PostgreSQL via Prisma → `packages/db-prisma` (`@core/db-prisma`)

## Architectural rules
1. **Never duplicate** types, routes, or DTOs — use `@core/api-contracts`.
2. **Shared logic** used by API + dashboard → extract to `packages/`.
3. **Strict typing:** Prisma types + api-contracts DTOs end-to-end.
4. **DB changes:** Prisma migrations only. Seeds must be idempotent.

## Commands (use pnpm filters)
```bash
pnpm dev
pnpm --filter @core/dashboard dev
pnpm --filter @core/api dev
pnpm turbo run build --filter=@core/api
pnpm --filter @core/db-prisma db:migrate:dev
pnpm --filter @core/db-prisma db:seed
```

## Full-stack data flow
`Prisma model` → `api-contracts resource + DTO` → `NestJS module` → `api-client CrudClient` → `dashboard module (generateResource)`

## Golden reference
Copy the **units** feature end-to-end when adding CRUD entities.

## Skills
- Project map: skill `project-map`
- Full-stack CRUD: skill `add-crud-feature`
- Layer details: `.cursor/skills/` (api-contracts, api-client, backend-resource-module, frontend-resource-pattern)
