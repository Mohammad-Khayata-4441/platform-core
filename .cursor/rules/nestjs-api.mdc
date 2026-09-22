---
description: NestJS API module conventions (4-layer CRUD)
globs: apps/api/**
alwaysApply: false
---

# NestJS API

## Module layout (4 layers)
Each feature under `apps/api/src/modules/<domain>/<feature>/`:
- `controllers/` — `createStandardCrudControllerBase` from `@core/backend-core`
- `services/` — `CrudService`, business rules in `beforeCreate` / `beforeUpdate`
- `repositories/` — `CrudRepository`, Prisma delegate in `super(prisma.model)`
- `presenters/` — entity → response DTO
- `dto/` — Create / Update / Response (class-validator + Swagger)
- `events/` — typed events using `resources.{key}.key`
- `<feature>.module.ts` — wire providers; export service if cross-module

## Rules
- NestJS DI, modules, guards — no raw Express in feature code
- JWT: `@UseGuards(JwtAuthGuard)` from `@/modules/identity/auth/guards`
- Resource key: `resources.{name}.key` from `@core/api-contracts`
- Do not call Prisma from services — use repository
- Do not return raw entities — use presenter
- Do not re-emit CRUD events in `onCreated` — base `CrudService` already emits

## Reference
`apps/api/src/modules/catalog/units/`
