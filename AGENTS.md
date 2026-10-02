# platform-core — Agent Guide

Turborepo + **pnpm** template monorepo holding the shared, domain-free core used to scaffold new projects.

> **New here?** Read `docs/superpowers/specs/2026-09-22-platform-core-design.md` for the design and `docs/superpowers/plans/` for the build plan.

## Stack

| Layer | Package | Path |
|-------|---------|------|
| Database | `@core/db-prisma` | `packages/db-prisma` |
| Contracts | `@core/api-contracts` | `packages/api-contracts` |
| API | `@core/api` | `apps/api` |
| HTTP clients | `@core/api-client` | `packages/api-client` |
| Backend kernel | `@core/backend-core` | `packages/backend-core` |
| Auth | `@core/auth` | `packages/auth` |
| Messaging | `@core/messaging` | `packages/messaging` (opt-in OTP, email, MsgPlus, Twilio) |
| i18n | `@core/i18n` | `packages/i18n` |
| Shared utils | `@core/shared` | `packages/shared` |
| SEO | `@core/seo` | `packages/seo` |
| UI | `@core/ui` | `packages/ui` |
| Dashboard | `@core/dashboard` | `apps/dashboard` (P2) |

## Before you change code

1. Load **`.ai/rules/monorepo.md`** — applies always.
2. Load **`.ai/rules/code-quality.md`** — applies always (surgical changes + verify-before-complete + lint gates).
3. Load the **path-scoped rule** from `.ai/rules/` matching the files you're editing.
4. For **non-trivial features**: check `docs/superpowers/specs/` → write or follow a design spec before coding.
5. For **full disciplined cycles**: use skill **`caveman`** — orient → brainstorm → spec → implement → review.
6. For **where things live**, use skill **`project-map`** (`.ai/skills/project-map/`).
7. For a **new CRUD entity end-to-end**, use skills **`add-crud-feature`** + **`feature-scaffold`**.
8. For a **dashboard form** use skill **`dashboard-form`**.
9. For a **single layer**, use the relevant skill from `.ai/skills/`.
10. For **business/domain logic**, follow `.ai/rules/domain.md`.

## Spec-driven development

| Artifact | Location | When |
|----------|----------|------|
| Design spec | `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` | Non-trivial features (required before code) |
| Implementation plan | `docs/superpowers/plans/YYYY-MM-DD-<topic>.md` | Large cross-stack work |
| Templates | `docs/superpowers/templates/` | Copy to start new spec/plan |

**HARD-GATE:** No implementation until the design spec is explicitly approved.

## Rules (`.ai/rules/`)

| File | Load when |
|------|-----------|
| `monorepo.md` | Always — cross-cutting architecture constraints |
| `code-quality.md` | Always — verify-before-complete + lint gates |
| `api.md` | Editing `apps/api/**` |
| `dashboard.md` | Editing `apps/dashboard/**` |
| `database.md` | Editing `packages/db-prisma/**` |
| `packages.md` | Editing `packages/**` |
| `domain.md` | Business/domain logic |

## Skills (`.ai/skills/`)

| Skill | When to use |
|-------|-------------|
| `caveman` | Full cycle: orient → brainstorm → spec → implement → review |
| `project-map` | Explore repo, find files, understand structure |
| `feature-scaffold` | File map + naming for new features |
| `add-crud-feature` | End-to-end new entity (full-stack checklist) |
| `api-contracts` | Resources + DTOs in `packages/api-contracts` |
| `api-client` | CrudClient + factory in `packages/api-client` |
| `backend-resource-module` | NestJS 4-layer module in `apps/api` |
| `dashboard-resource-page` | Dashboard CRUD list page |
| `dashboard-form` | Dashboard CRUD forms |
| `frontend-resource-pattern` | Compound resource architecture + data-view |

## Golden reference: Items vertical slice

```
packages/db-prisma/prisma/schema.prisma          # Item model (EXAMPLE)
packages/api-contracts/src/resources/items.resource.ts
apps/api/src/modules/example/items/
packages/api-client/src/clients/items.client.ts
```

## Data flow

```
Prisma model → api-contracts resource + DTO → NestJS module
(backend-core CrudController/Service/Repository) → OpenAPI spec
→ generated types → api-client CrudClient → generateResource page
```

DB Model ≠ API DTO ≠ Frontend ViewModel — never leak across layers.

## Commands

```bash
pnpm install
pnpm build
pnpm lint
pnpm check-types
pnpm test
pnpm generate                       # regenerate OpenAPI types (API must be running)
pnpm setup                          # scaffold this repo in place (rename scope, prune example)
pnpm --filter @core/api dev
pnpm --filter @core/db-prisma db:migrate:dev
```

**Scaffolding a new project:** `node packages/scaffold/bin/create-core-app.mjs <dir>` (see `packages/scaffold/README.md`).

**Verification order:** `pnpm lint` → `pnpm check-types` → `pnpm build` → `pnpm test`.

## Environment

- API env validated at startup via `apps/api/src/config/envValidator.ts`
- Required: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`, `PORT`, `CORS_ORIGINS`
- Frontend: `NEXT_PUBLIC_API_URL`

## Tech Stack

- **Runtime**: Node ≥ 22.12, TypeScript 7 (native `tsc`); TypeScript 6 is isolated to the `@core/codegen` tool
- **Package manager**: pnpm 10
- **Framework**: NestJS 12 (ESM; `apps/api` is `"type": "module"`), Next.js 16 (Turbopack), React 19.3
- **ORM**: Prisma 7.10 with `@prisma/adapter-pg`
- **Typing**: OpenAPI → `openapi-typescript` → `openapi-fetch`
- **State**: TanStack Query v5, react-hook-form, nuqs
- **Validation**: class-validator (API DTOs), Joi (env)
- **Tests**: Vitest 5 (`apps/api` and packages)
- **Lint**: oxlint (TypeScript 7 has no stable compiler API for typescript-eslint until 7.1)
