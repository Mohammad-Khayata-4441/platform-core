---
name: api
description: NestJS API module conventions (4-layer CRUD). Load when editing apps/api/**.
scope: apps/api/**
---

# NestJS API — Rules

## Module layout (4 layers)
Each feature under `apps/api/src/modules/<domain>/<feature>/`:
- `controllers/` — `createCrudController` factory from `@core/backend-core`
- `services/` — `CrudService`, business rules in `beforeCreate` / `beforeUpdate`
- `repositories/` — `CrudRepository`, Prisma delegate in `super(prisma.model)`
- `presenters/` — entity → response DTO (`CrudPresenter`)
- `dto/` — Create / Update / Response (class-validator + Swagger)
- `events/` — typed events using `resources.{key}.key`
- `<feature>.module.ts` — wire providers; export service if cross-module

## Rules
- NestJS DI, modules, guards — no raw Express in feature code
- JWT: `@UseGuards(JwtAuthGuard)` from `@/modules/identity/auth/guards`
- Resource key: `resources.{name}.key` from `@core/api-contracts` — never hardcode
- Do not call Prisma from services — use repository
- Do not return raw entities from controllers — always go through presenter
- Do not re-emit CRUD events in `onCreated` / `onUpdated` / `onDeleted` — base `CrudService` already does.
  Events are consumed by `CrudEventsListener` (`src/common/events/`) for structured debug logging
  (Phase 8.4.5); register future consumers there. `EventEmitterModule` runs in wildcard mode.

---

## Swagger / OpenAPI decorator requirements (MANDATORY)

Every DTO field **must** carry a complete `@ApiProperty` / `@ApiPropertyOptional` that
lets `openapi-typescript` generate the exact TypeScript type. Missing or wrong
decorators → wrong generated types → type workarounds in the dashboard. That chain
is **never acceptable**.

### Required decorator properties by field type

| Field type | Decorator | Required options |
|---|---|---|
| `string` (required) | `@ApiProperty` | `type: 'string'` |
| `number` (required) | `@ApiProperty` | `type: 'number'` |
| `boolean` (required) | `@ApiProperty` | `type: 'boolean'` |
| `string \| null` (optional nullable) | `@ApiPropertyOptional` | `type: 'string', nullable: true` |
| `number \| null` (optional nullable) | `@ApiPropertyOptional` | `type: 'number', nullable: true` |
| `boolean \| null` (optional nullable) | `@ApiPropertyOptional` | `type: 'boolean', nullable: true` |
| `string` (optional, never null) | `@ApiPropertyOptional` | `type: 'string'` |
| Enum | `@ApiProperty` | `enum: MyEnum, enumName: 'MyEnum'` |
| Nested object | `@ApiProperty` | `type: () => NestedDto` |
| Array | `@ApiProperty` | `type: () => ItemDto, isArray: true` |

**Examples of correct decorators:**

```typescript
// optional nullable string — the pattern that bit us
@ApiPropertyOptional({ type: 'string', nullable: true, example: 'abc-123' })
@IsOptional() @IsString()
accountId?: string | null;

// required string
@ApiProperty({ type: 'string', example: 'kg' })
@IsString() @IsNotEmpty()
code: string = '';

// required enum
@ApiProperty({ enum: InvoiceStatus, enumName: 'InvoiceStatus' })
@IsEnum(InvoiceStatus)
status: InvoiceStatus = InvoiceStatus.Draft;

// optional boolean (never null)
@ApiPropertyOptional({ type: 'boolean', example: true })
@IsOptional() @IsBoolean()
isActive?: boolean;
```

**Forbidden patterns:**

```typescript
// ❌ No type option — generates Record<string, never> for nullable fields
@ApiPropertyOptional({ example: 'abc-123', description: 'Account ID' })
accountId?: string | null;

// ❌ No decorator at all — field is invisible to OpenAPI, missing from generated types
isActive?: boolean;
```

---

## Mandatory: regenerate types after every backend DTO/controller change

After **any** change to a DTO class, Swagger decorator, or controller route in `apps/api/**`,
you **must** regenerate types. This applies whether or not the dev server is running.

```bash
# Always works — no running server, no running database required
pnpm generate
```

`pnpm generate` bootstraps NestJS without starting the HTTP server and without connecting
to the database (`GENERATE_SPEC=true` skips `PrismaService.$connect()`). It can always
run safely after a backend change.

**In watch mode** (`pnpm dev` running): types regenerate automatically on every NestJS
restart — `pnpm generate` is still the right call if you want to confirm the output
without waiting for a restart.

A backend task is **not complete** until:
1. Swagger decorators are correct (see table above)
2. `pnpm generate` has been run and succeeded
3. `packages/api-contracts/types/index.ts` reflects the new types
4. `packages/api-contracts` builds without errors

**Never** use `as any`, `as never`, `@ts-ignore`, or local interface re-declarations to work
around a type mismatch that stems from stale or incorrect generated types. Fix the decorator,
regenerate, rebuild.

## Domain boundaries (lint-enforced)

Each directory under `apps/api/src/modules/` is a domain. **Outside a domain, import only its public entry point.** Deep imports are `no-restricted-imports` errors, configured in `apps/api/eslint/domain-boundaries.mjs` and proven by `pnpm --filter @core/api lint:architecture` (CI). Inside a domain, use relative imports and never import your own barrel (that creates module cycles).

| Domain | Public entry point(s) | Exposes |
|---|---|---|
| `accounting` | `accounting/posting`, `accounting/document-sequences`, `accounting/financial-settings`, `accounting/fiscal-periods`, `accounting/currencies`, `accounting/opening-balances`, `accounting/reconciliation`, `accounting/accounts/utils`, `accounting/accounts/bootstrap` | `AccountingPostingFacade` + `PostingIntent` types; numbering; tenant setup config; currencies; opening-balance subledger services; reconciliation monitor; period/slot guards; CoA bootstrap |
| `identity` | `identity/auth/guards`, `identity/auth/decorators` | `JwtAuthGuard`, `@CurrentUser` (shared kernel) |
| `inventory` | `inventory` | `InventoryModule`, `InventoryService`, `InventoryMovementFacade` + `MovementIntent` types |
| `invoicing` | `invoicing` | `computeInvoicePaidState`, `CashboxesModule`/`CashboxesService`/`CreateCashboxDto`, `BankAccountsModule`/`BankAccountsService`/`CreateBankAccountDto`, `InvoiceTypesModule`/`InvoiceTypesService` |
| `custom-fields` | `custom-fields` | `CustomFieldsModule`, `CustomFieldValuesService`, `CustomFieldsRepository` |
| `catalog` | `catalog` | `UnitsModule`, `UnitsService` |
| `platform` | `platform` | `CodeSequencesModule`, `CodeSequencesService` (master-data code allocation) |
| `parties`, `reports`, `files`, `audit`, `ai-chat` | — (no consumers yet) | add an `index.ts` before another domain depends on it |

Allowed dependency graph (besides every domain → `identity` auth kernel):

```
invoicing ─┬─► accounting (posting, document-sequences, accounts/utils)
           ├─► inventory
           └─► platform
inventory ─┬─► accounting (posting, document-sequences, accounts/utils)
           └─► platform
catalog   ─┬─► inventory
           ├─► custom-fields
           └─► platform
identity  ───► accounting (document-sequences, financial-settings, fiscal-periods)   # onboarding
identity  ───► accounting (currencies, opening-balances, reconciliation, accounts/bootstrap)
identity  ───► catalog (UnitsModule/UnitsService)   # onboarding default units
identity  ───► invoicing (CashboxesModule/Service, BankAccountsModule/Service)   # business-setup
reports   ───► invoicing
```

`src/app.module.ts` is the composition root and is exempt. **Adding an edge** means: export the symbol from the target's `index.ts`, add it to the table above, and add a probe case to `apps/api/scripts/check-architecture-rules.mjs`. **Adding a domain** folder fails `lint:architecture` until it has a `DOMAIN_RESTRICTIONS` entry.

The graph is machine-checked (Phase 8.1.2): `apps/api/src/domain/manifest.ts` declares each domain's
`dependsOn` / `provides` / `routes`; `pnpm --filter @core/api lint:architecture` fails when the
manifest drifts from the production import graph, controller routes or barrel exports. `identity` is the
shared auth kernel and is omitted from `dependsOn`.

`DISABLED_DOMAINS` (comma-separated keys, process env or `.env.<NODE_ENV>`) removes optional domains at
boot; requests to a disabled domain answer 404 with a clear message (guard + filter). Non-optional domains
(`accounting`, `audit`, `identity`, `inventory`, `invoicing`, `platform`) and domains an enabled domain depends on
cannot be disabled — the registry throws a clear configuration error at startup.

## Deletion semantics (per model)

Rule: **financial documents and ledger rows are cancelled or reversed, never hard-deleted** (`.ai/rules/domain.md`). Enforced by service status guards (400), `StatusGuardedCrudRepository` (409 backstop), a `no-restricted-syntax` lint rule on raw Prisma deletes (reviewed allowlist in `apps/api/eslint.config.mjs`), and pinned by `*.delete-guard.spec.ts` / `payments.delete-http.spec.ts`.

| Model | Policy | How |
|---|---|---|
| `Invoice` | cancel-only once POSTED; DRAFT deletable in service, **no HTTP route** | `POST /invoices/:id/cancel` reverses JE + stock |
| `Payment` | cancel-only once POSTED; DRAFT hard delete (`DELETE /payments/:id`, bulk) | `POST /payments/:id/cancel`; `StatusGuardedCrudService` + `StatusGuardedCrudRepository` |
| `Expense` | cancel-only once POSTED; DRAFT hard delete (`DELETE /expenses/:id`) | `POST /expenses/:id/cancel` reverses JE |
| `JournalEntry`, `JournalLine` | never deleted | reversal entry via `AccountingPostingFacade.reverse` |
| `StockMovement` | never deleted | compensating movement via `InventoryMovementFacade` |
| `StockCount` | never deleted (no route); DRAFT stays draft | — |
| `OpeningBalanceSession` | DRAFT hard delete; later statuses immutable | `assertMutable` |
| `PaymentAllocation` | hard delete (link row, no GL effect) | `POST /payments/:id/allocations/:allocationId/remove` |
| `ChartOfAccount` | **soft delete** (archive via `deletedAt`), refused if journal lines exist | `AccountsService.delete` |
| `Party`, `Cashbox`, `BankAccount`, `Currency` | hard delete **only if no ledger rows reference it**, else 409 → set `isActive = false` | `beforeDelete` + `countLedgerReferences` — their ledger FKs are `ON DELETE SET NULL` |
| Other master data (units, brands, items, warehouses, categories, tags, invoice types, …) | hard delete; FK `RESTRICT` violations map to 409 | `CrudRepository` + `mapPrismaError` — not audited row-by-row in Phase 5 |
| Whole tenant | danger-zone reset of all transactional data | `DataResetService`, phrase-confirmed |

Adding a deletable financial model: extend `StatusGuardedCrudRepository`, or add the delete site to the lint allowlist **with** a pinning test. Known debt: flip the `SET NULL` ledger FKs to `RESTRICT` in a migration.

## Outbox seam (Phase 8.4)

`OUTBOX_ENABLED` (default `false`) turns on the dual-write outbox: `AccountingPostingFacade` keeps posting
synchronously and additionally writes an `OutboxEvent` row in the same transaction. A poll worker
(`src/outbox/outbox-worker.service.ts`) delivers rows through `OutboxHandlerRegistry` with retry
(`OUTBOX_RETRY_DELAY_MS`) and dead-lettering. Enabling the flag does not change GL consistency, call sites
or the facade return type; the async GL split (enqueue-only) requires a design review per `.ai/rules/domain.md` §4.

## Reference
`apps/api/src/modules/catalog/units/`
