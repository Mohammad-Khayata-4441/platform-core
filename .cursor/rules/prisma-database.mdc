---
description: Prisma schema, migrations, and seed conventions
globs: packages/db-prisma/**
alwaysApply: false
---

# Database (Prisma)

- Schema split: `packages/db-prisma/src/schema/*.prisma`
- Migrations: `src/schema/migrations/`
- Seed: `src/seed/index.ts` — safe to re-run
- Import client/types: `@core/db-prisma`
- Nest DI: `@core/db-prisma/nest` (`PrismaModule`)

## Entity conventions
- `id` (uuid), `tenantId`, `createdAt`, `updatedAt` on tenant-scoped models

## Commands
```bash
pnpm --filter @core/db-prisma db:generate
pnpm --filter @core/db-prisma db:migrate:dev
pnpm --filter @core/db-prisma db:seed
```

Never edit `generated/client/` manually.
