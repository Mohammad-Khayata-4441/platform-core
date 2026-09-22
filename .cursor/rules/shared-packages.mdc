---
description: Shared package boundaries and dependency direction
globs: packages/**
alwaysApply: false
---

# Shared Packages

## Dependency direction
`db-prisma` ← `backend-core` ← `api`  
`api-contracts` ← `api-client` ← `dashboard`  
Both `api` and `dashboard` depend on `api-contracts`.

## Packages
| Package | Role |
|---------|------|
| `@core/db-prisma` | Prisma schema, migrations, seed, Nest `PrismaModule` |
| `@core/api-contracts` | Resource definitions + shared DTOs (source of truth) |
| `@core/api-client` | Typed HTTP clients (`CrudClient`) |
| `@core/backend-core` | CRUD bases, API response builder, query utils |
| `@core/ui` | Shared UI components |
| `@core/eslint-config`, `@core/typescript-config` | Tooling |

## Rules
- Add routes/DTOs in **api-contracts first**
- New CRUD client: extend `CrudClient`, register in `api.ts` factory
- No domain logic in `backend-core`
