# Platform Core — Foundation Milestone (P0 + P1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the `platform-core` Turborepo template and extract the generic foundation — tooling, `@core/db-prisma`, `@core/api-contracts`, `@core/auth`, `@core/backend-core`, `@core/api-client` — plus a NestJS API skeleton with a worked `items` example slice and the OpenAPI→types codegen pipeline.

**Architecture:** Template monorepo (pnpm workspaces + Turborepo). Codegen-first: NestJS emits OpenAPI, `openapi-typescript` generates `@core/api-contracts/types`, `openapi-fetch`-based `CrudClient` consumes them. Backend CRUD kernel (`backend-core`) is domain-free; RBAC permissions and tenancy are injected by the consuming app. Frontends never import `db-prisma`.

**Tech Stack:** Node ≥ 20, pnpm 9, Turborepo ≥ 2.7, TypeScript 5.9, NestJS 11, Prisma 6.7 + `@prisma/adapter-pg`, `openapi-fetch` 0.14, `openapi-typescript` 7.10, React 19, Next.js 15.5, Vitest, Jest + Supertest.

## Global Constraints

- Package scope is **`@core/*`**; repo root is **`platform-core`**. All paths below are relative to the repo root.
- **Node ≥ 20**, **pnpm@9.0.0**, **turbo ^2.7.3**, **typescript 5.9.2**.
- **No domain terms** in any `@core/*` package (no product/order/invoice/unit/accounting/etc.).
- **No frontend package may import `@core/db-prisma`.** Only `apps/api` (and `backend-core`, which is api-only) may.
- **Codegen-first:** contracts' generated types live at `packages/api-contracts/types/index.ts` and are produced only by `pnpm generate`. Never hand-edit them.
- **Single-tenant by default**; tenancy is opt-in via an injected resolver.
- **RBAC:** `@core` defines the guard/decorator + an open `PermissionKey` type; the consuming app supplies the catalog.
- **Locales:** `ar` + `en`, RTL-safe (logical CSS only). Core UI strings must be i18n-driven.
- **Response envelope:** `{ status, message, data, error?, meta? }` (`status` is `"success" | "error"`); HTTP status codes are also set on the response.
- Every task ends green on `pnpm lint`, `pnpm check-types`, and `pnpm build` (or the task's stated subset) before its commit.
- Source repos (read-only references): `../e-dukan` and `../devloggers/erp` relative to the repo root.

---

## File Structure (created/modified by this plan)

```
platform-core/
  package.json                      root scripts + devDeps
  pnpm-workspace.yaml
  turbo.json
  .gitignore  .npmrc  .prettierrc  .prettierignore
  README.md
  .github/workflows/ci.yml
  .ai/rules/*.md  .ai/skills/**    AGENTS.md  CLAUDE.md
  opencode.json  .cursor/**  .claude/**
  packages/
    typescript-config/              @core/typescript-config
    eslint-config/                  @core/eslint-config
    db-prisma/                      @core/db-prisma
    api-contracts/                  @core/api-contracts
    auth/                           @core/auth
    backend-core/                   @core/backend-core
    api-client/                     @core/api-client
  apps/
    api/                            @core/api
```

---

## Task 1: Repo skeleton + workspace/tooling config

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.gitignore`, `.npmrc`, `.prettierrc`, `.prettierignore`, `README.md`

**Interfaces:**
- Consumes: nothing.
- Produces: a workspace where `pnpm install` succeeds and `pnpm turbo run build` is a no-op success.

- [ ] **Step 1: Write `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 2: Write root `package.json`**

```json
{
  "name": "platform-core",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "check-types": "turbo run check-types",
    "test": "turbo run test",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
    "generate": "pnpm --filter @core/api generate:spec && pnpm --filter @core/api-contracts build"
  },
  "devDependencies": {
    "prettier": "^3.6.2",
    "turbo": "^2.7.3",
    "typescript": "5.9.2"
  },
  "packageManager": "pnpm@9.0.0",
  "engines": { "node": ">=20" }
}
```

- [ ] **Step 3: Write `turbo.json`**

```json
{
  "$schema": "https://turborepo.com/schema.json",
  "ui": "tui",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**", "!.next/cache/**"] },
    "lint": { "dependsOn": ["^lint"] },
    "check-types": { "dependsOn": ["^check-types"] },
    "test": { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
    "dev": { "cache": false, "persistent": true }
  },
  "concurrency": "20"
}
```

- [ ] **Step 4: Write `.npmrc`, `.gitignore`, `.prettierrc`, `.prettierignore`**

`.npmrc`:
```
auto-install-peers=true
strict-peer-dependencies=false
```
`.gitignore`:
```
node_modules
dist
.next
.turbo
coverage
*.log
.env
.env.*
!.env.example
.DS_Store
```
`.prettierrc`:
```json
{ "semi": true, "singleQuote": true, "trailingComma": "all", "printWidth": 100 }
```
`.prettierignore`:
```
dist
.next
.turbo
node_modules
pnpm-lock.yaml
packages/api-contracts/types
```

- [ ] **Step 5: Write `README.md`**

```markdown
# platform-core

Turborepo template with the shared, domain-free core used to scaffold new projects.

## Quick start

```bash
pnpm install
pnpm build
pnpm generate   # regenerate OpenAPI types (API must be running)
```

See `docs/superpowers/specs/2026-09-22-platform-core-design.md` for the design.
```

- [ ] **Step 6: Verify install + turbo graph**

Run: `pnpm install`
Expected: lockfile created, no workspace errors.
Run: `pnpm turbo run build --dry=json`
Expected: exit 0 (no packages yet → empty task graph).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold platform-core workspace and tooling"
```

---

## Task 2: `@core/typescript-config` + `@core/eslint-config`

**Files:**
- Create: `packages/typescript-config/{package.json,base.json,nextjs.json,react-library.json}`
- Create: `packages/eslint-config/{package.json,base.js,next.js,react-internal.js}`

**Interfaces:**
- Consumes: Task 1 workspace.
- Produces: `@core/typescript-config` (JSON presets consumed by path) and `@core/eslint-config` (exports `./base`, `./next-js`, `./react-internal`).

- [ ] **Step 1: Port typescript-config**

Copy `../devloggers/erp/packages/typescript-config/{base.json,nextjs.json,react-library.json}` into `packages/typescript-config/`. Create `packages/typescript-config/package.json`:

```json
{
  "name": "@core/typescript-config",
  "version": "0.0.0",
  "private": true,
  "license": "MIT",
  "files": ["base.json", "nextjs.json", "react-library.json"]
}
```

- [ ] **Step 2: Port eslint-config**

Copy `../devloggers/erp/packages/eslint-config/{base.js,next.js,react-internal.js}` into `packages/eslint-config/`. Create `packages/eslint-config/package.json`:

```json
{
  "name": "@core/eslint-config",
  "version": "0.0.0",
  "private": true,
  "license": "MIT",
  "exports": {
    "./base": "./base.js",
    "./next-js": "./next.js",
    "./react-internal": "./react-internal.js"
  }
}
```

- [ ] **Step 3: Verify**

Run: `pnpm install`
Expected: two new workspace packages resolve.
Run: `node -e "require('./packages/typescript-config/base.json'); require('./packages/eslint-config/base.js')"`
Expected: no throw.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: add shared typescript and eslint configs"
```

---

## Task 3: AI-engineering setup + CI

**Files:**
- Create: `AGENTS.md`, `CLAUDE.md`, `opencode.json`, `.github/workflows/ci.yml`
- Create: `.ai/rules/{monorepo,code-quality,api,dashboard,database,packages}.md`
- Create: `.ai/skills/**` (project-map, feature-scaffold, add-crud-feature, backend-resource-module, dashboard-resource-page, dashboard-form, api-contracts, api-client)
- Create: `.claude/**`, `.cursor/**` (from erp)

**Interfaces:**
- Consumes: Task 1–2.
- Produces: inherited AI workflow; CI running `lint → check-types → build → test`.

- [ ] **Step 1: Port rules and skills**

Copy `../devloggers/erp/.ai/rules/` → `.ai/rules/`, and copy these skill dirs from `../devloggers/erp/.ai/skills/` → `.ai/skills/`: `erp-project-map` (rename dir to `project-map`), `feature-scaffold`, `add-crud-feature`, `api-contracts`, `api-client`, `backend-resource-module`, `dashboard-resource-page`, `dashboard-form`, `frontend-resource-pattern`.

- [ ] **Step 2: De-domain the ported docs**

In every copied `.ai/rules/*.md` and `.ai/skills/**/SKILL.md`, replace occurrences of `@devloggers/` → `@core/`, `Devloggers ERP` → `platform-core`, `apps/dashboard` stays, `packages/db-prisma` stays. Remove any references to ERP domain modules (accounting, invoices, units) that appear as *required* context; keep the `items` example as the golden slice instead.

- [ ] **Step 3: Write root `AGENTS.md`**

Adapt `../devloggers/erp/AGENTS.md` to platform-core: keep the structure (stack table, before-you-change-code, rules, skills, golden reference, commands). Set the stack table to `@core/db-prisma`, `@core/api-contracts`, `@core/api`, `@core/api-client`, `@core/dashboard` (dashboard added in P2). Set golden reference to the `items` slice paths from Tasks 11–12. Commands:

```bash
pnpm install
pnpm build
pnpm lint
pnpm check-types
pnpm test
pnpm generate
pnpm --filter @core/api dev
```

- [ ] **Step 4: Write `CLAUDE.md` + port agent configs**

Create `CLAUDE.md` mirroring `AGENTS.md` (or `@AGENTS.md` include). Copy `../devloggers/erp/opencode.json` → `opencode.json` and fix any `@devloggers` references. Copy `.claude/` and `.cursor/` config dirs, de-domaining references. Add root script `"sync:claude": "node scripts/sync-claude-artifacts.mjs"` only if the erp script is ported in this task; otherwise omit it.

- [ ] **Step 5: Write CI workflow `.github/workflows/ci.yml`**

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm check-types
      - run: pnpm build
      - run: pnpm test
```

- [ ] **Step 6: Verify**

Run: `pnpm lint`
Expected: passes (or reports only packages without lint scripts as skipped).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: port AI-engineering rules, skills, agent configs, and CI"
```

---

## Task 4: `@core/db-prisma`

**Files:**
- Create: `packages/db-prisma/package.json`, `tsconfig.json`, `tsconfig.build.json`
- Create: `packages/db-prisma/src/{index.ts,db.ts,client/index.ts,nest/prisma.service.ts,nest/prisma.module.ts,types/translation.ts,seed/index.ts,seed/run.ts}`
- Create: `packages/db-prisma/prisma/schema.prisma` (minimal, example-owned)

**Interfaces:**
- Consumes: `@core/typescript-config`.
- Produces: `PrismaService` (extends `PrismaClient`, implements `OnModuleInit`/`OnModuleDestroy`), `PrismaModule` (`@Global()`), `createClient()`, `ensureDbExists()`, `Translatable`, `runSeed(fn)`.

- [ ] **Step 1: Port plumbing (no schema, no domain seeds)**

Copy from `../devloggers/erp/packages/db-prisma/src/`:
- `client/index.ts` → `src/client/index.ts`
- `db.ts` → `src/db.ts`
- `nest/prisma.service.ts`, `nest/prisma.module.ts` → same paths
- `types/translation.ts` → `src/types/translation.ts`
- `src/index.ts` → `src/index.ts` (delete domain re-exports)

**Do not copy** any `src/schema/*.prisma` except a minimal placeholder, any `src/seed/seeds/*`, `backfill-*`, `src/types/index.ts` domain types, or `scripts/*` that reference domain models.

- [ ] **Step 2: Write minimal `prisma/schema.prisma`**

```prisma
generator client {
  provider        = "prisma-client-js"
  output          = "../src/generated/client"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

- [ ] **Step 3: Write `packages/db-prisma/package.json`**

```json
{
  "name": "@core/db-prisma",
  "version": "0.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js", "require": "./dist/index.js" },
    "./client": { "types": "./dist/client/index.d.ts", "import": "./dist/client/index.js", "require": "./dist/client/index.js" },
    "./nest": { "types": "./dist/nest/prisma.module.d.ts", "import": "./dist/nest/prisma.module.js", "require": "./dist/nest/prisma.module.js" }
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "dev": "tsc --watch",
    "lint": "echo skip",
    "check-types": "tsc --noEmit",
    "db:generate": "prisma generate",
    "db:migrate:dev": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/adapter-pg": "^6.7.0",
    "@prisma/client": "^6.7.0"
  },
  "peerDependencies": { "@nestjs/common": "^11.0.0" },
  "devDependencies": {
    "@core/typescript-config": "workspace:*",
    "prisma": "^6.7.0",
    "typescript": "5.9.2"
  }
}
```

- [ ] **Step 4: Add `tsconfig.json` / `tsconfig.build.json`**

```json
// tsconfig.json
{ "extends": "@core/typescript-config/base.json", "compilerOptions": { "outDir": "dist", "rootDir": "src" }, "include": ["src"] }
```
```json
// tsconfig.build.json
{ "extends": "./tsconfig.json", "exclude": ["**/*.spec.ts", "**/*.test.ts"] }
```

- [ ] **Step 5: Write a seed harness test (Vitest)**

Create `packages/db-prisma/src/seed/run.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { runSeed } from './run';

describe('runSeed', () => {
  it('invokes the callback once and returns its result', async () => {
    let calls = 0;
    const result = await runSeed(async () => { calls += 1; return 42; });
    expect(calls).toBe(1);
    expect(result).toBe(42);
  });
});
```

Add `"test": "vitest run"` and `"vitest": "^2.1.8"` to the package.

- [ ] **Step 6: Implement `src/seed/run.ts`**

```ts
export async function runSeed<T>(fn: () => Promise<T>): Promise<T> {
  return fn();
}
```

- [ ] **Step 7: Run tests + typecheck**

Run: `pnpm --filter @core/db-prisma test`
Expected: PASS.
Run: `pnpm --filter @core/db-prisma check-types`
Expected: no errors (run `pnpm --filter @core/db-prisma db:generate` first so the client exists).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(db-prisma): add prisma plumbing and seed harness"
```

---

## Task 5: `@core/api-contracts`

**Files:**
- Create: `packages/api-contracts/package.json`, `tsconfig.json`, `tsconfig.build.json`
- Create: `packages/api-contracts/src/{index.ts,api/**,resources/**,dto/**,permissions/types.ts,filter/**,settings/settings-registry.ts}`
- Create: `packages/api-contracts/types/index.ts` (generated placeholder)

**Interfaces:**
- Consumes: `@core/typescript-config`.
- Produces: `ApiResponse`, `ApiError`, `ApiErrorCode`, `FieldError`, `ApiMeta`, `Pagination`, `ApiQueryOptions`, `FilterSchema`, `defineResource`, `defineCrudResource`, `CrudRoutes`, `LocalizedString`, `BulkResult`, `BulkUpdateItem`, `PermissionKey`, `createSettingsRegistry`.

- [ ] **Step 1: Port base `api/` and `resources/` primitives**

Copy from `../devloggers/erp/packages/api-contracts/src/`:
- `api/ApiResponse.ts`, `api/ApiError.ts`, `api/ApiMeta.ts`, `api/ApiQueryOptions.ts`, `api/FilterSchema.ts`, `api/types.ts`, `api/index.ts`
- `resources/base/resource.ts`, `resources/base/crud-resource.ts`, `resources/base/resource.types.ts`, `resources/index.ts`
- `dto/i18n.dto.ts`, `dto/bulk.dto.ts`, `dto/import-export.dto.ts`, `dto/index.ts`
- `custom-fields/**`, `settings/settings-registry.ts`

**Do not copy** any `resources/<domain>/*`, `dto/<domain>*.ts`, `enums/`, `permissions/permission-catalog.ts`, `permissions/default-role-permissions.ts`, `*-import-export.ts`, or `src/data/**`.

- [ ] **Step 2: Replace the permission catalog with an open type**

Create `packages/api-contracts/src/permissions/types.ts`:

```ts
/** Branded string. The consuming app supplies the concrete union via module augmentation. */
export type PermissionKey = string & { readonly __permissionKey?: unique symbol };

export interface RolePermissionMap {
  [role: string]: PermissionKey[];
}
```

Create `packages/api-contracts/src/permissions/index.ts`:
```ts
export * from './types';
```

- [ ] **Step 3: Remove Prisma coupling from the ported `enums`/settings**

Ensure `settings/settings-registry.ts` has **no** domain keys (defaultTaxRate, defaultWarehouseId, etc.) and imports nothing from `@core/db-prisma`. Keep only the generic registry framework (`createSettingsRegistry`, `getDefaults`, `mergeWithDefaults`, `validateSettingsPatch`). Ensure no file in `src/` imports `@core/db-prisma`.

- [ ] **Step 4: Write `src/index.ts`**

```ts
export * from './api';
export * from './resources';
export * from './dto';
export * from './custom-fields';
export * from './settings/settings-registry';
export * from './permissions';
```

- [ ] **Step 5: Create the generated-types placeholder + package.json exports**

Create `packages/api-contracts/types/index.ts`:
```ts
// AUTO-GENERATED by `pnpm generate` (openapi-typescript). Do not edit by hand.
export type paths = Record<string, never>;
export type components = { schemas: Record<string, never> };
export type operations = Record<string, never>;
```

`packages/api-contracts/package.json`:
```json
{
  "name": "@core/api-contracts",
  "version": "0.0.0",
  "private": true,
  "main": "./dist/src/index.js",
  "types": "./dist/src/index.d.ts",
  "exports": {
    ".": { "types": "./dist/src/index.d.ts", "import": "./dist/src/index.js", "require": "./dist/src/index.js" },
    "./types": { "types": "./types/index.ts", "import": "./types/index.ts", "require": "./types/index.ts" }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "lint": "echo skip",
    "check-types": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {},
  "devDependencies": {
    "@core/typescript-config": "workspace:*",
    "typescript": "5.9.2",
    "vitest": "^2.1.8"
  }
}
```

Note: `tsconfig.json` must set `"rootDir": "."` with `"include": ["src", "types"]` so `types/index.ts` is emitted under `dist/types`.

- [ ] **Step 6: Write a unit test for the resource primitive**

Create `packages/api-contracts/src/resources/base/resource.spec.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { defineResource } from './resource';

describe('defineResource', () => {
  it('preserves key and routes', () => {
    const r = defineResource({
      key: 'items',
      routes: { list: 'items', byId: 'items/{id}' },
    });
    expect(r.key).toBe('items');
    expect(r.routes.byId).toBe('items/{id}');
  });
});
```
(Adjust to the exact `defineResource` signature you ported — it must accept `{ key, routes }` and return them unchanged.)

- [ ] **Step 7: Run tests + typecheck**

Run: `pnpm --filter @core/api-contracts test` → PASS.
Run: `pnpm --filter @core/api-contracts check-types` → no errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(api-contracts): add domain-free envelope, resources, and settings framework"
```

---

## Task 6: `@core/auth`

**Files:**
- Create: `packages/auth/package.json`, `tsconfig.json`, `tsconfig.build.json`
- Create: `packages/auth/src/{index.ts,constants.ts,types.ts,next/index.ts,next/middleware.ts,react/index.ts,nest/index.ts}`
- Create: `packages/auth/src/next/middleware.spec.ts`, `packages/auth/src/react/index.spec.ts`

**Interfaces:**
- Consumes: nothing (framework-agnostic root).
- Produces: `ACCESS_TOKEN_COOKIE`, `REFRESH_TOKEN_COOKIE`, `REFRESH_COOKIE_PATHS`, `AuthAudience`, `AuthClaims`, `getSession`, `isAuthenticated`, `createAuthMiddleware`, `isAccessTokenExpired`, `mergeCookieHeader`, `createRefreshCoordinator`, `CurrentUser`, `RequirePermission`, `PermissionGuard`.

- [ ] **Step 1: Port the e-dukan auth toolkit**

Copy from `../e-dukan/packages/auth/src/`: `constants.ts`, `types.ts`, `next/index.ts`, `next/middleware.ts`, `next/middleware.test.ts`, `react/index.ts`, `react/index.test.ts`, `index.ts`. Copy `package.json` as a base.

- [ ] **Step 2: Generalize the token payload (remove store fields)**

In `src/types.ts`, replace the domain payload with generic claims:

```ts
import type { AuthAudience } from './constants';
import type { PermissionKey } from '@core/api-contracts';

export interface AuthClaims {
  sub: string;
  audience: AuthAudience;
  roles: string[];
  permissions: PermissionKey[];
  /** Project-specific claims (e.g. tenantId, storeId). */
  extra?: Record<string, unknown>;
  iat?: number;
  exp?: number;
}
```

Update `src/next/index.ts` (`getSession`) and any consumer to use `AuthClaims`. Remove `storeId`, `storeName`, `storeSlug`.

- [ ] **Step 3: Add a Nest adapter `src/nest/index.ts`**

Port the generic Nest auth primitives from `../devloggers/erp/apps/api/src/modules/identity/auth/` (JWT guard, `@Public`, `@CurrentUser`, `@RequirePermission`, `PermissionGuard`), adapting imports to `@core/auth` types and `@core/api-contracts` `PermissionKey`. Export them from `src/nest/index.ts`. Ensure the guard reads the permission catalog via an injected token (see Task 7 `PERMISSION_CATALOG`).

- [ ] **Step 4: Update `package.json` exports**

```json
{
  "name": "@core/auth",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./next": { "types": "./dist/next/index.d.ts", "import": "./dist/next/index.js" },
    "./middleware": { "types": "./dist/next/middleware.d.ts", "import": "./dist/next/middleware.js" },
    "./react": { "types": "./dist/react/index.d.ts", "import": "./dist/react/index.js" },
    "./nest": { "types": "./dist/nest/index.d.ts", "import": "./dist/nest/index.js" }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "lint": "echo skip",
    "check-types": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": { "@core/api-contracts": "workspace:*" },
  "peerDependencies": { "next": ">=15", "react": "^19.0.0", "@nestjs/common": "^11.0.0" },
  "peerDependenciesMeta": { "next": { "optional": true }, "react": { "optional": true }, "@nestjs/common": { "optional": true } },
  "devDependencies": {
    "@core/typescript-config": "workspace:*",
    "@types/node": "^22.0.0",
    "typescript": "5.9.2",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 5: Run the ported tests**

Run: `pnpm --filter @core/auth test`
Expected: `middleware.spec` and `react/index.spec` PASS (adjust the ported specs' imports from `@e-dukan/auth` to relative paths).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(auth): add generic cookie-jwt toolkit with nest/next/react adapters"
```

---

## Task 7: `@core/backend-core`

**Files:**
- Create: `packages/backend-core/package.json`, `tsconfig.json`, `tsconfig.build.json`
- Create: `packages/backend-core/src/**` (ported, de-domained)

**Interfaces:**
- Consumes: `@core/api-contracts`, `@core/db-prisma`.
- Produces: `ApiResponseBuilder`, `ApiExceptionFilter`, `ValidationExceptionFactory`, query utils (`resolvePagination`, `buildPrismaWhere`, `buildPrismaOrderBy`), `createCrudController`, `CrudService`, `CrudRepository`, `CrudPresenter`, `CrudEvents`, `withTenantScoping`, `StatusGuardedCrudService`, `PERMISSION_CATALOG` token, `CurrentUser`, `RequirePermission`, import/export engine.

- [ ] **Step 1: Port the generic kernel**

Copy from `../devloggers/erp/packages/backend-core/src/` all of:
`api/**`, `auth/**`, `base/**` (except `base.service.ts`, `base.controller.ts`), `decorators/**`, `i18n/**`, `import-export/**`, `prisma/prisma-delegate.interface.ts`, `utils/query-builder.ts`, and `index.ts`.

**Do not copy** `base/base.service.ts`, `base/base.controller.ts` (legacy). Do not copy `auth/permission-catalog.spec.ts` (domain assertions).

- [ ] **Step 2: De-domain the permission layer**

Delete `auth/permission-catalog.spec.ts`. In `auth/require-permission.decorator.ts`, `base/crud-controller.ts`, and `base/crud-import-export-controller.ts`, change imports of `PermissionKey` from `@devloggers/api-contracts` to `@core/api-contracts`. Introduce a Nest injection token:

Create `packages/backend-core/src/auth/permission-catalog.ts`:
```ts
import type { RolePermissionMap } from '@core/api-contracts';

export const PERMISSION_CATALOG = Symbol('PERMISSION_CATALOG');
export type PermissionCatalog = RolePermissionMap;
```

The consuming app provides `{ provide: PERMISSION_CATALOG, useValue: itsCatalog }`. Ensure the guard resolves permissions through this token rather than a hardcoded import.

- [ ] **Step 3: Make state-guarding configurable**

In `base/status-guarded-crud-service.ts` and `base/status-guarded-crud-repository.ts`, replace the hardcoded `['DRAFT']` and "financial documents" wording with constructor-injected config:

```ts
export interface StatusGuardConfig {
  mutableStatuses: string[];
  /** Optional error message when a guarded mutation is rejected. */
  rejectionMessage?: string;
}
```

Remove all accounting/domain wording; default `rejectionMessage` to `'Resource is not in an editable state.'`.

- [ ] **Step 4: Make i18n locales configurable**

In `api/api-query.utils.ts`, replace the hardcoded `LOCALIZED_PATHS = ['ar','en']` with an exported constant `DEFAULT_LOCALIZED_PATHS = ['ar','en']` that callers may override via an options argument. In `i18n/locale-resolver.service.ts`, replace `'ar' | 'en'` with `string` and read the locale list from constructor-provided config (`{ locales: string[]; fallback: string }`).

- [ ] **Step 5: Remove the Prisma-model test coupling**

Delete `base/crud-repository.type-test.ts` (imports the `Unit` model). Keep `prisma/prisma-delegate.interface.ts` (generic Prisma types) and the `P2002`/`P2003` handling in `crud-repository.ts`.

- [ ] **Step 6: Write `src/index.ts`**

```ts
export * from './base';
export * from './import-export';
export * from './prisma/prisma-delegate.interface';
export * from './utils/query-builder';
export * from './auth';
export * from './api';
export * from './decorators';
export * from './i18n';
```
(`base/index.ts` must not re-export `base.service`/`base.controller`.)

- [ ] **Step 7: `package.json`**

```json
{
  "name": "@core/backend-core",
  "version": "0.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js", "require": "./dist/index.js" } },
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "dev": "tsc --watch",
    "lint": "echo skip",
    "check-types": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@core/api-contracts": "workspace:*",
    "@core/db-prisma": "workspace:*",
    "exceljs": "^4.4.0"
  },
  "peerDependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/swagger": "^11.0.0",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.0",
    "multer": "1.4.5-lts.2"
  },
  "devDependencies": {
    "@core/typescript-config": "workspace:*",
    "@nestjs/common": "^11.0.1",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.2",
    "typescript": "5.9.2",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 8: Run ported unit tests**

Run: `pnpm --filter @core/backend-core test`
Expected: `api-query.utils.spec`, `api-error-response.spec`, `validation-exception.factory.spec`, `status-guarded-crud-*.spec` PASS (update imports `@devloggers/*` → `@core/*`).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(backend-core): add domain-free nestjs crud kernel"
```

---

## Task 8: `@core/api-client`

**Files:**
- Create: `packages/api-client/package.json`, `tsconfig.json`, `tsconfig.build.json`
- Create: `packages/api-client/src/{index.ts,infra/**,react/**,utils/**,server.ts,api.ts}`

**Interfaces:**
- Consumes: `@core/api-contracts` (`./types`).
- Produces: `ApiClient`, `CrudClient<R extends CrudResource>`, `ICrudClient`, `createApi`, `ApiProvider`, `useApi`, `crudKeys`, `useCrudList`, `useCrudDetails`, `useCrudMutations`, `createServerClient`.

- [ ] **Step 1: Port generic infra/react/utils**

Copy from `../devloggers/erp/packages/api-client/src/`: `infra/**`, `react/**`, `react.ts`, `utils/**`, `index.ts`, `infra/index.ts`. **Do not copy** `clients/**`, the domain `api.ts` registry, or `server.ts` domain helper.

- [ ] **Step 2: Write a generic `createApi` factory**

Replace the domain registry with `packages/api-client/src/api.ts`:

```ts
import type { ICrudClient } from './infra/crud-client';

export type ClientMap = Record<string, ICrudClient>;

export function createApi<T extends ClientMap>(clients: T): T {
  return clients;
}

export type Api = ReturnType<typeof createApi>;
```

- [ ] **Step 3: Write a generic server helper**

`packages/api-client/src/server.ts`:
```ts
export interface ServerClientOptions {
  baseUrl: string;
  cookieHeader: string;
  tokenCookieName?: string;
}

export function createServerClient({ baseUrl, cookieHeader, tokenCookieName = 'access_token' }: ServerClientOptions) {
  const headers: Record<string, string> = { cookie: cookieHeader };
  void tokenCookieName;
  return { baseUrl, headers };
}
```
(Replace any `AuthUser`/`auth_token` domain coupling; the concrete fetch wiring stays in `infra/client.ts`.)

- [ ] **Step 4: `package.json`**

```json
{
  "name": "@core/api-client",
  "version": "0.0.0",
  "private": true,
  "exports": {
    ".": "./src/index.ts",
    "./infra": "./src/infra/index.ts",
    "./react": "./src/react.ts",
    "./server": "./src/server.ts"
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "dev": "tsc --watch",
    "lint": "echo skip",
    "check-types": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@core/api-contracts": "workspace:*",
    "openapi-fetch": "^0.14.0"
  },
  "peerDependencies": { "@tanstack/react-query": "^5.0.0", "react": "^19.0.0", "next": ">=15" },
  "peerDependenciesMeta": { "next": { "optional": true } },
  "devDependencies": {
    "@core/typescript-config": "workspace:*",
    "@tanstack/react-query": "^5.95.2",
    "@types/react": "^19.2.2",
    "react": "^19.2.0",
    "typescript": "5.9.2",
    "vitest": "^2.1.8"
  }
}
```
Remove the dangling `./postman/*` and `./open-api/*` exports.

- [ ] **Step 5: Run ported tests + typecheck**

Run: `pnpm --filter @core/api-client test` → PASS.
Run: `pnpm --filter @core/api-client check-types` → no errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(api-client): add generic openapi-fetch client, crud-client, and react hooks"
```

---

## Task 9: `apps/api` skeleton + codegen pipeline

**Files:**
- Create: `apps/api/package.json`, `tsconfig.json`, `nest-cli.json`, `src/{main.ts,app.module.ts}`
- Create: `apps/api/src/config/{configuration.ts,envValidator.ts}`
- Create: `apps/api/src/common/{api,decorators,filters,pipes}/**` (re-export shims to backend-core)
- Create: `apps/api/src/contracts/contract-generation.ts`, `apps/api/scripts/generate-spec.ts`
- Create: `apps/api/src/health/health.controller.ts`
- Create: `apps/api/test/jest-e2e.json`, `apps/api/test/app.e2e-spec.ts`

**Interfaces:**
- Consumes: `@core/backend-core`, `@core/api-contracts`, `@core/db-prisma`, `@core/auth`, `@core/i18n` (i18n optional in this milestone; if not yet built, skip its wiring).
- Produces: booted Nest app with global envelope/validation/RBAC wiring; `pnpm --filter @core/api generate:spec` writes `openapi.yaml` + `packages/api-contracts/types/index.ts`.

- [ ] **Step 1: Port the app shell**

Copy from `../devloggers/erp/apps/api/`: `nest-cli.json`, `tsconfig.json`, `tsconfig.build.json`, `test/jest-e2e.json`, `src/config/configuration.ts`, `src/config/envValidator.ts`, `src/common/**` (the thin re-export shims), `src/main.ts`, `src/app.module.ts`, `src/contracts/contract-generation.ts`, `scripts/generate-spec.ts`.

- [ ] **Step 2: De-domain `main.ts` and `app.module.ts`**

Remove domain module imports and the domain manifest/outbox wiring from `app.module.ts`; keep global `ValidationPipe`, `ApiExceptionFilter`, `ThrottlerGuard`, auth guard, and the `PERMISSION_CATALOG` provider. In `main.ts`, remove hardcoded brand/CORS values; read from env (`CORS_ORIGINS`, `API_TITLE`). Keep the two Swagger bootstrap paths calling `buildContractDocument` + `writeContractArtifacts`.

- [ ] **Step 3: Generalize `contract-generation.ts`**

Change the title/description to env-driven (`process.env.API_TITLE ?? 'Platform Core API'`). Keep `CONTRACT_SPEC_PATH`, `CONTRACT_TYPES_PATH` (points to `../../packages/api-contracts/types/index.ts`), and the `openapi-typescript` exec. Ensure no ERP strings remain.

- [ ] **Step 4: Add a health controller + e2e test**

`apps/api/src/health/health.controller.ts`:
```ts
import { Controller, Get } from '@nestjs/common';
import { ApiResponseBuilder } from '@core/backend-core';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return ApiResponseBuilder.success({ status: 'ok' }, 'Healthy');
  }
}
```

`apps/api/test/app.e2e-spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('health (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
  });
  afterAll(() => app.close());

  it('GET /health returns the envelope', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toMatchObject({ message: 'Healthy', data: { status: 'ok' } });
  });
});
```

- [ ] **Step 5: `apps/api/package.json`**

Port erp's `apps/api/package.json`, rename to `@core/api`, set deps to `@core/*` workspace packages, and keep scripts `build`, `dev`, `start`, `test`, `test:e2e`, `generate:spec`, `lint`, `check-types`. Add `"typecheck": "tsc --noEmit"` and ensure `generate:spec` builds deps first: `pnpm --filter @core/api... build && ts-node ... scripts/generate-spec.ts`.

- [ ] **Step 6: Verify boot + e2e**

Run: `pnpm --filter @core/api build` → success.
Run: `pnpm --filter @core/api test:e2e` → health test PASS.
Run: `pnpm generate` (API must be able to boot a throwaway app; the spec generator boots in-process) → `apps/api/openapi.yaml` and `packages/api-contracts/types/index.ts` written; `paths` contains `/health`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(api): add domain-free nestjs skeleton and openapi codegen pipeline"
```

---

## Task 10: Example slice — DB + contracts + API module

**Files:**
- Create: `packages/db-prisma/prisma/schema.prisma` (add `Item` model)
- Create: `packages/db-prisma/prisma/migrations/**` (via `prisma migrate dev`)
- Create: `packages/api-contracts/src/resources/items.resource.ts`, `packages/api-contracts/src/dto/item.dto.ts`
- Create: `apps/api/src/modules/example/items/{items.module.ts,items.service.ts,items.repository.ts,items.presenter.ts,items.controller.ts,dto/items.dto.ts}`
- Create: `apps/api/src/modules/example/items/items.e2e-spec.ts`

**Interfaces:**
- Consumes: Tasks 4,5,7,9.
- Produces: `itemsResource` (`defineCrudResource`), `ItemDto`, `CreateItemDto`, `UpdateItemDto`; `ItemRepository extends CrudRepository`, `ItemsService extends CrudService`, `ItemsController` via `createCrudController`; routes `example/items` and `example/items/{id}`.

- [ ] **Step 1: Add the `Item` model**

Append to `packages/db-prisma/prisma/schema.prisma`:
```prisma
/// EXAMPLE — remove via scaffold CLI.
model Item {
  id        String   @id @default(cuid())
  name      Json
  sku       String   @unique
  price     Decimal  @db.Decimal(12, 2)
  status    String   @default("DRAFT")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 2: Generate + migrate**

Run: `pnpm --filter @core/db-prisma db:generate`
Run: `pnpm --filter @core/db-prisma db:migrate:dev --name add_item_example`
Expected: migration created; client regenerated with `Item`.

- [ ] **Step 3: Contracts — DTO + resource**

`packages/api-contracts/src/dto/item.dto.ts`:
```ts
import type { LocalizedString } from './i18n.dto';

export type ItemStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface ItemDto {
  id: string;
  name: LocalizedString;
  sku: string;
  price: number;
  status: ItemStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateItemDto {
  name: LocalizedString;
  sku: string;
  price: number;
  status?: ItemStatus;
}

export type UpdateItemDto = Partial<CreateItemDto>;
```
Export from `dto/index.ts`.

`packages/api-contracts/src/resources/items.resource.ts`:
```ts
import { defineCrudResource } from './base/crud-resource';

export const itemsResource = defineCrudResource({
  key: 'items',
  routes: { list: 'example/items', byId: 'example/items/{id}' },
});
```
Export from `resources/index.ts`.

- [ ] **Step 4: Write the failing e2e test**

`apps/api/src/modules/example/items/items.e2e-spec.ts`:
```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../app.module';

describe('items (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });
  afterAll(() => app.close());

  it('creates, lists, updates, deletes an item', async () => {
    const create = await request(app.getHttpServer())
      .post('/example/items')
      .send({ name: { ar: 'منتج', en: 'Item' }, sku: 'SKU-1', price: 10 })
      .expect(201);
    const id = create.body.data.id;
    expect(create.body.data.sku).toBe('SKU-1');

    const list = await request(app.getHttpServer()).get('/example/items').expect(200);
    expect(Array.isArray(list.body.data)).toBe(true);

    await request(app.getHttpServer())
      .patch(`/example/items/${id}`)
      .send({ price: 20 })
      .expect(200);

    await request(app.getHttpServer()).delete(`/example/items/${id}`).expect(200);
  });
});
```

- [ ] **Step 5: Run it to verify it fails**

Run: `pnpm --filter @core/api test:e2e -- items`
Expected: FAIL (route `/example/items` not found).

- [ ] **Step 6: Implement repository + service + presenter + controller**

`items.repository.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { CrudRepository } from '@core/backend-core';
import { PrismaService } from '@core/db-prisma/nest';

@Injectable()
export class ItemsRepository extends CrudRepository<PrismaService['item']> {
  constructor(prisma: PrismaService) {
    super(prisma.item, { model: 'item' });
  }
}
```

`items.presenter.ts`:
```ts
import { CrudPresenter } from '@core/backend-core';
import type { ItemDto } from '@core/api-contracts';
import type { Item } from '@core/db-prisma';

export class ItemsPresenter extends CrudPresenter<Item, ItemDto> {
  toDto(item: Item): ItemDto {
    return {
      id: item.id,
      name: item.name as ItemDto['name'],
      sku: item.sku,
      price: Number(item.price),
      status: item.status as ItemDto['status'],
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
```

`items.service.ts`:
```ts
import { Injectable } from '@nestjs/common';
import { CrudService } from '@core/backend-core';
import { ItemsRepository } from './items.repository';

@Injectable()
export class ItemsService extends CrudService<ItemsRepository> {
  constructor(repository: ItemsRepository) {
    super(repository);
  }
}
```

`items.controller.ts`:
```ts
import { Controller } from '@nestjs/common';
import { createCrudController } from '@core/backend-core';
import { ItemsService } from './items.service';
import { ItemsPresenter } from './items.presenter';
import { CreateItemDto, UpdateItemDto } from './dto/items.dto';

export const ItemsController = createCrudController({
  route: 'example/items',
  service: ItemsService,
  presenter: ItemsPresenter,
  createDto: CreateItemDto,
  updateDto: UpdateItemDto,
  permissions: { create: 'items.create', update: 'items.update', delete: 'items.delete' },
});
```

`dto/items.dto.ts` — class-validator classes mirroring `CreateItemDto`/`UpdateItemDto`:
```ts
import { IsNumber, IsObject, IsOptional, IsString, IsIn } from 'class-validator';

export class CreateItemDto {
  @IsObject() name!: { ar: string; en?: string };
  @IsString() sku!: string;
  @IsNumber() price!: number;
  @IsOptional() @IsIn(['DRAFT', 'ACTIVE', 'ARCHIVED']) status?: string;
}

export class UpdateItemDto {
  @IsOptional() @IsObject() name?: { ar: string; en?: string };
  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsNumber() price?: number;
  @IsOptional() @IsIn(['DRAFT', 'ACTIVE', 'ARCHIVED']) status?: string;
}
```

`items.module.ts`:
```ts
import { Module } from '@nestjs/common';
import { ItemsService } from './items.service';
import { ItemsRepository } from './items.repository';
import { ItemsController } from './items.controller';

@Module({ controllers: [ItemsController], providers: [ItemsService, ItemsRepository] })
export class ItemsModule {}
```

Register `ItemsModule` in `app.module.ts` and export `itemsResource` from contracts.

Note: adjust the exact `createCrudController`/`CrudRepository`/`CrudPresenter` option shapes to the signatures you ported in Task 7; the above reflects the erp golden slice (`modules/catalog/units/`). When in doubt, mirror `../devloggers/erp/apps/api/src/modules/catalog/units/`.

- [ ] **Step 7: Run the e2e test to verify it passes**

Run: `pnpm --filter @core/api test:e2e -- items`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(example): add items vertical slice (db, contracts, api)"
```

---

## Task 11: Example slice — api-client + codegen + docs

**Files:**
- Create: `packages/api-client/src/clients/items.client.ts`, `packages/api-client/src/clients/index.ts`
- Modify: `packages/api-contracts/types/index.ts` (regenerated)
- Modify: `README.md`, `AGENTS.md` (document the golden slice + `pnpm generate`)

**Interfaces:**
- Consumes: Tasks 5,8,10.
- Produces: `ItemsClient extends CrudClient<typeof itemsResource>`, exported `clients` map, and a committed regenerated OpenAPI type surface.

- [ ] **Step 1: Write the failing test**

`packages/api-client/src/clients/items.client.spec.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createApiClient } from '../infra/client';
import { ItemsClient } from './items.client';

describe('ItemsClient', () => {
  it('exposes the items resource routes', () => {
    const client = new ItemsClient(createApiClient({ baseUrl: 'http://localhost' }));
    expect(client.resource.key).toBe('items');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @core/api-client test -- items`
Expected: FAIL (module `./items.client` not found).

- [ ] **Step 3: Implement the client**

`packages/api-client/src/clients/items.client.ts`:
```ts
import { CrudClient } from '../infra/crud-client';
import { itemsResource } from '@core/api-contracts';

export class ItemsClient extends CrudClient<typeof itemsResource> {
  constructor(client: ConstructorParameters<typeof CrudClient<typeof itemsResource>>[0]) {
    super(client, itemsResource);
  }
}
```
(Match the actual `CrudClient` constructor signature from Task 8; the erp pattern is `super(httpClient, resource)`.)

`packages/api-client/src/clients/index.ts`:
```ts
import { ItemsClient } from './items.client';
export { ItemsClient };
```
Export the `clients` map from the package root if the erp client exposes one.

- [ ] **Step 4: Regenerate contracts and verify types compile**

Run: `pnpm generate` (API boots in-process; no DB needed for spec generation)
Expected: `packages/api-contracts/types/index.ts` now includes `/example/items` paths.
Run: `pnpm --filter @core/api-client check-types`
Expected: no errors.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @core/api-client test -- items`
Expected: PASS.

- [ ] **Step 6: Document the golden slice**

Update `README.md` and `AGENTS.md` with the `items` golden-slice file map and the `pnpm generate` workflow.

- [ ] **Step 7: Full milestone verification**

Run: `pnpm lint && pnpm check-types && pnpm build && pnpm test`
Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(example): add items api-client and regenerate openapi types"
```

---

## Self-Review Notes

- **Spec coverage:** P0 (Tasks 1–3), db-prisma (4), api-contracts (5), auth (6), backend-core (7), api-client (8), apps/api + codegen (9), example slice (10–11). **Deferred to later plans (by design):** `@core/ui` + dashboard shell + `generateResource` + `apps/dashboard` (P2); `@core/i18n`, `@core/shared`, `@core/seo`, notifications, file upload (P3); `scaffold` CLI + in-place `setup` (P4); outbox/desktop/n8n/docs (optional).
- **Port tasks** are deterministic copy + listed edits with exact source paths, not placeholders; **novel tasks** carry complete code.
- **Type consistency:** `PermissionKey` (contracts) → `PERMISSION_CATALOG` token (backend-core) → injected by apps; `CrudResource` (contracts) → `CrudClient<R>` (api-client) → `ItemsClient`; `itemsResource.routes` used identically in API controller route and client.
- **Known adjustment points** (flagged inline): exact `createCrudController`/`CrudRepository`/`CrudPresenter`/`CrudClient` option shapes must mirror the ported erp sources; `@core/i18n` wiring is optional in this milestone.
