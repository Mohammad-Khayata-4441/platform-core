---
name: database
description: Prisma schema, migrations, and seed conventions. Load when editing packages/db-prisma/**.
scope: packages/db-prisma/**
---

# Database (Prisma) — Rules

## File layout
- Schema split: `packages/db-prisma/src/schema/*.prisma`
- Migrations: `src/schema/migrations/`
- Seed: `src/seed/index.ts` — must be idempotent (safe to re-run)
- Import client/types: `@core/db-prisma`
- Nest DI: `@core/db-prisma/nest` (`PrismaModule`)

## Entity conventions
Every tenant-scoped model must have:
- `id String @id @default(uuid())`
- `tenantId String @map("tenant_id")` + `tenant Tenant @relation(..., onDelete: Cascade)`
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`
- snake_case DB columns via `@map`, tables via `@@map` (e.g. `@@map("invoice_lines")`)

Exceptions: polymorphic tables (`TagAssignment`, `CustomFieldValue`, `AuditLog`) and the
scope-only `File` table carry `tenantId` for filtering but have **no** `tenant` FK.

## Schema conventions
- **Localized strings:** user-facing name/label fields are `Json @db.JsonB` holding
  `{ ar: string; en?: string }` (`ar` required) — e.g. `Role.name`, `Currency.name`,
  `Cashbox.name`, `InvoiceType.name`, `ChartOfAccount.name`, `CustomField.name/label`.
  Never store these as plain `String`.
- **Money:** `Decimal @db.Decimal(18, 4)`. Percentages: `Decimal @db.Decimal(5, 2)`.
  Exchange rates: `Decimal @db.Decimal(18, 6)` (`Invoice/Payment/Expense/JournalEntry.exchangeRate`,
  default `1`, locked at posting).
- **Denormalized caches** (`ChartOfAccount.currentBalance`, `Cashbox.balance`, `StockBalance`)
  are updated by application/service logic — never written from ad-hoc queries. Source of
  truth is the ledger rows (`JournalLine`, `StockMovement`).
- **Polymorphic relations** (`entityType` + `entityId`) cannot have a Prisma FK; cascade
  deletion of their rows must happen in the application layer within the same transaction.
- **GL mapping:** `FinancialSetting` (1-to-1 with `Tenant`) holds default sales/purchase/tax/
  receivable/payable accounts; `Party.receivableAccountId`/`payableAccountId` override per party.

## Rules
- Never edit `generated/client/` manually — it is auto-generated
- All schema changes require a migration (`db:migrate:dev`)
- Seeds must be idempotent
- Role uniqueness (`tenantId`, `name->>'ar'`) is a raw SQL expression index in a migration,
  not a Prisma `@@unique` — hand-edit the generated migration SQL when adding similar ones

## Commands
```bash
pnpm --filter @core/db-prisma db:generate
pnpm --filter @core/db-prisma db:migrate:dev
pnpm --filter @core/db-prisma db:seed
```
