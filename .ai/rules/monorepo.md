---
name: monorepo
description: ERP monorepo core architecture and cross-cutting constraints. Load always.
scope: always
---

# ERP Monorepo — Core Rules

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

## Full-stack data flow
`Prisma model` → `api-contracts resource + DTO` → `NestJS module` → `api-client CrudClient` → `dashboard module (generateResource)`

## Golden reference
Copy the **units** feature end-to-end when adding CRUD entities.

## Spec-driven development
Non-trivial features require an approved design before implementation:
- Specs: `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
- Plans: `docs/superpowers/plans/YYYY-MM-DD-<topic>.md`
- Templates: `docs/superpowers/templates/`
- Workflow: `docs/superpowers/README.md`, skill **`caveman`**

## AI engineering docs
- Onboarding: `docs/ai-engineering.md`
- Agent entry: `AGENTS.md`

## Commands
```bash
pnpm dev
pnpm --filter @core/dashboard dev
pnpm --filter @core/api dev
pnpm turbo run build --filter=@core/api
pnpm --filter @core/db-prisma db:migrate:dev
pnpm --filter @core/db-prisma db:seed
```
