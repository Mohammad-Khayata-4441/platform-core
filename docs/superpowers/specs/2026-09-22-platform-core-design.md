# Platform Core — Design

**Date:** 2026-09-22
**Author:** opencode (agent) + owner
**Status:** Draft
**Scope:** New Turborepo template repo (`platform-core`) that extracts all generic, non-domain logic from `e-dukan` and `devloggers/erp`
**Primary goal:** One reusable core + scaffold that lets a new project go from zero to a typed, RBAC-guarded, CRUD-capable full-stack app without re-implementing shared infrastructure.

---

## Context

Two existing monorepos (`C:\Users\LOQ\Desktop\workspace\e-dukan` and `C:\Users\LOQ\Desktop\workspace\devloggers\erp`) independently grew a nearly identical generic stack: shared API contracts/typing, a CRUD system, cookie-JWT auth, i18n, backend NestJS infrastructure, and a frontend UI system (shadcn, forms, data views, dashboard shell). The domain logic differs; the infrastructure does not. This spec defines a new repo that captures the infrastructure once.

### Existing sources

- `e-dukan/packages/{api-client,auth,contracts,db,shared,ui,locales,seo,eslint-config,typescript-config}`
- `e-dukan/apps/{api,store-dashboard,admin,storefront}`
- `erp/packages/{backend-core,api-contracts,api-client,db-prisma,i18n,ui,eslint-config,typescript-config}`
- `erp/apps/{api,dashboard}`
- `erp/.ai/` (rules + skills), both repos' `AGENTS.md` / `CLAUDE.md` / agent configs

### Key divergence to resolve (decided below)

The two repos implement the same layers differently. `platform-core` standardizes on one canonical approach per layer (see [Decisions](#decisions)).

---

## Decisions

| # | Decision | Choice |
|---|----------|--------|
| D1 | Consumption model | **Template repo + `create-*` CLI + in-place `pnpm setup`** |
| D2 | Existing projects | **Left untouched**; core may freely redesign/rename |
| D3 | Contract strategy | **Codegen-first** (NestJS → OpenAPI → generated types → `openapi-fetch`) |
| D4 | Frontend CRUD architecture | **erp `generateResource` compound architecture** |
| D5 | Multi-tenancy | **Single-tenant by default; opt-in** via mixin/resolver |
| D6 | Authorization | **RBAC permission catalog + guard**, project supplies the catalog |
| D7 | Locales | **ar + en, RTL**, extendable by config |
| D8 | Repo / scope | **`platform-core`**, packages scoped **`@core/*`** |
| D9 | First milestone | **Foundation first**, then UI |
| D10 | Example | **Ship one neutral `items` vertical slice** (deletable) |
| D11 | Scaffold | **`create-core-app` CLI + in-place `pnpm setup`** |
| D12 | AI conventions | **Port the full `.ai/` setup** (rules, skills, agent configs) |

---

## Goals

- Extract all reusable, non-domain logic into `@core/*` packages.
- Provide a self-demonstrating template (example slice) and a scaffold CLI.
- End-to-end typing: DB model → contracts → API → client → UI.
- Enforce clean layering (no domain leakage, no frontend → DB imports).
- Inherit the AI-engineering workflow (rules, skills, agent configs).

## Non-goals

- Migrating `e-dukan` or `erp` onto the core.
- Shipping any domain/business logic (products, orders, accounting, invoicing).
- A public/open-source release or npm publishing pipeline (template consumption only).

---

## Requirements

### Functional

- [ ] `@core/*` packages for contracts, api-client, backend-core, db-prisma, auth, i18n, ui, shared, seo, tooling.
- [ ] Codegen pipeline: `pnpm generate` → OpenAPI spec → generated types in `@core/api-contracts`.
- [ ] Generic CRUD: NestJS controller/service/repository + `CrudClient` + `generateResource` UI.
- [ ] Cookie-JWT auth (access + refresh, silent server refresh, single-flight client refresh).
- [ ] RBAC guard + decorator; project-supplied permission catalog.
- [ ] i18n ar+en with RTL, extendable locale registry.
- [ ] One worked `items` example slice across all layers.
- [ ] `create-core-app` CLI + in-place `pnpm setup`; prune example + unused packages.
- [ ] Shared dashboard shell/layout (`DashboardPage`) and form/data-view UI.

### Non-functional

- [ ] No `db-prisma` import from any frontend package.
- [ ] No domain terms in `@core/*` (verified by review + grep).
- [ ] No hardcoded Arabic/domain strings in `@core/ui` (i18n-driven).
- [ ] RTL-safe UI (logical CSS properties).
- [ ] `lint → check-types → build → test` all green via turbo.
- [ ] Configurable by env/config (no hardcoded brand, currency, ports, domains).
- [ ] OpenAPI/Swagger completeness for the example slice.

---

## Architecture

### Repo layout

```
platform-core/
  apps/
    api/              # NestJS skeleton: backend-core + auth + i18n wired, RBAC, env, Swagger→OpenAPI
    dashboard/        # Next.js 15 App Router skeleton: ui + api-client + auth wired, no domain
  packages/
    backend-core/     # NestJS CRUD kernel, response builder, query utils, filters/pipes,
                      #   RBAC guard+decorator, import/export engine
    api-contracts/    # envelope, Resource primitives, ApiQueryOptions, filter DSL,
                      #   base DTOs, generated types seam
    api-client/       # openapi-fetch client, CrudClient + ICrudClient, query serializer, react hooks
    db-prisma/        # Prisma client plumbing + global PrismaModule + seed harness (NO schema)
    auth/             # cookie-JWT toolkit; subpaths ./next ./nest ./react ./middleware
    i18n/             # ar+en locales, RTL, next-intl + nest wiring, extendable registry
    ui/               # shadcn + RHF forms + generateResource + DashboardPage shell
    shared/           # formatters, subdomain, print/download, url helpers
    seo/              # metadata factories, JSON-LD, sitemap/robots
    scaffold/         # create-core-app CLI
    eslint-config/
    typescript-config/
  .ai/                # rules + skills
  AGENTS.md  CLAUDE.md  turbo.json  pnpm-workspace.yaml
  docs/superpowers/   # specs, plans, templates
```

### Dependency rules (enforced)

```
db-prisma      → apps/api only
api-contracts  → api, backend-core, api-client, apps
backend-core   → apps/api only
api-client     → frontends only
auth           → all (framework-agnostic root; ./next ./nest ./react)
ui             → frontends (depends api-client + api-contracts)
shared         → all
```

Frontends never import `db-prisma`. Domain never leaks into `@core/*`.

### Canonical source per layer

| Layer | Taken from | Adaptation |
|---|---|---|
| Contracts / envelope / resources / filter DSL | erp `api-contracts` (base only) | drop domain DTOs/resources/permissions |
| OpenAPI → types codegen seam | erp `apps/api/src/contracts` | keep generic |
| API client (openapi-fetch, CrudClient, react) | erp `api-client` (`infra/`, `react/`, `utils/`) | drop 34 domain clients; generic factory |
| Backend CRUD kernel | erp `backend-core` | de-domain; tenancy opt-in; drop legacy `base.service`/`base.controller` |
| Prisma plumbing | erp `db-prisma` (`nest/`, client) | no schema, no seeds |
| Auth toolkit | e-dukan `@e-dukan/auth` | generalize `storeId/storeName` → generic claims |
| i18n | merge erp wiring + e-dukan locales | ar+en, RTL |
| UI primitives + forms + `generateResource` | erp `apps/dashboard/shared/**` | de-domain `RESOURCE_PERMISSIONS`; i18n strings |
| Dashboard shell / `DashboardPage` / layouts | e-dukan `@e-dukan/ui` layouts | port into `@core/ui` |
| shared utils | e-dukan `@e-dukan/shared` + erp equivalents | — |
| SEO | e-dukan `@e-dukan/seo` (generic parts) | drop product/category metadata |
| Tooling + `.ai/` + agent configs | both | — |

### Data flow (end-to-end typed)

```
Prisma model → api-contracts resource + DTO → NestJS module
(backend-core CrudController/Service/Repository) → OpenAPI spec
→ generated types → api-client CrudClient → generateResource page
```

---

## Layer details

### 1. Database (`@core/db-prisma`)

- `createClient()` with `@prisma/adapter-pg`; `PrismaService` + global `PrismaModule`; `ensureDbExists()`.
- Generic seed harness (`seed()` orchestrator + script runner). **No domain schema or seeds.**
- Optional split-schema merge script retained for projects that want it.
- Project owns `prisma/schema.prisma` and migrations.

### 2. Contracts (`@core/api-contracts`)

- Envelope: `ApiResponse`, `ApiError`, `ApiErrorCode`, `FieldError`, `ApiMeta` (`Pagination`/`Cursor`).
- Query: `ApiQueryOptions`, filter DSL (`FilterSchema`, operators, `ListFilterField`).
- Resource primitives: `defineResource`, `defineCrudResource` (`{id}` placeholder routes), `CrudRoutes`.
- Base DTOs: `LocalizedString`, `BulkResult`, `BulkUpdateItem`, import/export DTOs.
- `types/` generated from OpenAPI. Zod is **not** part of core (codegen-first).
- RBAC types: `PermissionKey` (open branded string), role→permission map type. **Project supplies catalog.**

### 3. Backend core (`@core/backend-core`)

- `api/`: `ApiResponseBuilder`, exception filter, validation-exception factory, Swagger DTOs, query utils (`resolvePagination`, `buildPrismaWhere`, `buildPrismaOrderBy`), filter Swagger decorators.
- `base/`: `createCrudController`, `CrudService` (before/after hooks + event emission), `CrudRepository` (Prisma delegate seam), `CrudPresenter`, `CrudEvents`, bulk DTOs, generic Excel import/export services + controller.
- Tenancy **opt-in**: `withTenantScoping()` mixin / injected `tenantResolver`; default single-tenant.
- State-guarded CRUD kept but **configurable** (`mutableStatuses` injected; no accounting wording).
- `auth/`: `@CurrentUser`, `@RequirePermission`, `PermissionGuard` (permission catalog injected by app).
- `i18n/`: `LocaleResolverService` reads locale set from config; `LocalizedString` DTO.
- `import-export/`: `excel-workbook`, `parse-utils`.
- Legacy `base.service.ts` / `base.controller.ts` are **not** ported.

### 4. API app (`apps/api`)

- Bootstrap: helmet, env-driven CORS, Swagger (`/docs`), versioning.
- Global wiring: validation pipe, exception filter, throttler, auth guard, RBAC guard.
- `config/`: Joi env validator (project-extendable), configuration loader.
- `contracts/contract-generation.ts`: OpenAPI → `openapi.yaml` → `@core/api-contracts/types`.
- Optional: transactional outbox module.

### 5. API client (`@core/api-client`)

- `infra/`: `openapi-fetch` `ApiClient`, `CrudClient<R extends CrudResource>` + `ICrudClient`, list/bulk/export/import/template, query serializer, `unwrap-api-data`, formData/json helpers, `toCamelCase`.
- `react/`: `ApiProvider`, `useApi`, `crud-keys`, `useCrudList`, `useCrudDetails`, `useCrudMutations`.
- Generic `createApi()` factory: **project passes its client map** (no hardcoded registry).
- Server helper: generic cookie-forwarding fetcher (cookie names configurable).

### 6. Auth (`@core/auth`)

- Subpaths: `.` (constants/types/audience), `./nest` (guards/decorators), `./next` (`getSession`, `isAuthenticated`), `./middleware` (`createAuthMiddleware`, silent refresh), `./react` (`createRefreshCoordinator`).
- Generic claims (`sub`, `roles`, `permissions`, `audience`, `extra`) — no `storeId/storeName`.
- Cookie names + audiences configurable.

### 7. i18n (`@core/i18n`)

- ar + en JSON namespaces (system/common/auth/profile + placeholders), RTL.
- next-intl factories (`routing`, `request`, `navigation`, `middleware`) + Nest i18n module/service.
- Locale registry extendable by config (add `tr` etc.).

### 8. UI (`@core/ui`)

- shadcn/Radix primitives + `cn`.
- RHF form architecture: `resource-form-shell`, `rhform`, `rhf-field`, `field-shell`, controls (text/textarea/checkbox/select/async-select/resource-select/file/image/date), field wrappers, `use-resource-form-controller`, `apply-field-errors`.
- `data-view/resource`: `generateResource` compound (`Provider/Page/Table/FormDialog/CreateButton/Grid/Pagination/Search/Filter/Toolbar/SelectionToolbar/useContext`), table-view, filter panel, editable-grid, custom-fields renderer.
- Dashboard shell (from e-dukan): `DashboardPage` compound, `DashboardHeader`, desktop/mobile/responsive layouts, nav types, `DashboardProvider`, providers (Theme/Query/Api/Nuqs/Sonner/Confirm).
- De-domain: permission map + nav config injected; order-stats removed; **all strings i18n-driven**.
- Optional subpaths: file upload, notifications/FCM.

### 9. shared / seo

- `shared`: currency/text/url formatters, subdomain helpers, print/download document hooks.
- `seo`: host resolution, hreflang, `JsonLd`, metadata factory base, sitemap/robots factories (generic only).

### 10. Example slice (`items`)

Neutral CRUD end-to-end, marked `EXAMPLE`:

```
packages/db-prisma/... (example schema)
packages/api-contracts/src/resources/items.resource.ts + dto
apps/api/src/modules/example/items/
packages/api-client/src/clients/items.client.ts
apps/dashboard/modules/items/ + app route
```

Fields: `name` (LocalizedString), `sku`, `price`, `status`. Deleted by the scaffold CLI.

---

## Scaffold CLI

- `create-core-app <dir>` (small create-* package):
  1. Copy template (git/local path).
  2. Prompt: project name, package scope, dashboard app name, locales, optional packages (import/export, seo, notifications, file upload, outbox, desktop/n8n/docs app shells).
  3. Prune example slice + unused packages.
  4. Rewrite scope/names across manifests.
  5. Reset git, write `.env.example`.
  6. Optionally install dependencies.
- In-place `pnpm setup` performs the same prompts on a cloned repo.
- Optional `pnpm generate resource <name>` scaffolds a new vertical slice.

---

## Error handling

- Single envelope `{ message, data, error?, meta? }`; **HTTP status only** (no `status` field in body).
- `ApiErrorCode` + `FieldError[]`; validation factory maps class-validator errors; global exception filter normalizes everything.
- Client surfaces `ApiError` with `.code` and `.validationErrors`.

---

## Testing & CI

- `apps/api`: jest unit (`*.spec.ts`) + supertest e2e for the example slice.
- `@core/backend-core`: unit tests for CRUD kernel, query utils, import/export.
- `@core/ui`: vitest + testing-library for forms/data-view/shell primitives.
- Example slice: Playwright e2e (list/create/edit/delete, ar RTL + en).
- Contract check: regenerate OpenAPI + type-check.
- CI: `lint → check-types → build → test` via turbo + GitHub Actions.

---

## Documentation & AI setup

- `AGENTS.md`, `CLAUDE.md`.
- `.ai/rules/`: `monorepo.md`, `code-quality.md`, `api.md`, `dashboard.md`, `database.md`, `packages.md`.
- `.ai/skills/`: project-map, feature-scaffold, add-crud-feature, backend-resource-module, dashboard-resource-page, dashboard-form, api-contracts, api-client.
- Superpowers plugin + `opencode.json` / Cursor / Claude configs.
- `docs/superpowers/` (README, templates, specs, plans), `docs/architecture.md`.

---

## Phasing

- **P0** — repo skeleton, tooling (`eslint-config`, `typescript-config`, turbo, pnpm, prettier), `.ai/` rules+skills, agent configs, CI.
- **P1 (first milestone)** — `db-prisma`, `api-contracts`, `backend-core`, `api-client`, `auth`, `apps/api` skeleton, `items` example slice (DB → contracts → API → client), codegen pipeline. *(The `apps/dashboard` skeleton and the UI-side example page are part of P2 because they depend on `@core/ui`.)*
- **P2** — `ui` (shadcn, forms, `generateResource`, dashboard shell) + `apps/dashboard` skeleton + wire the `items` example page.
- **P3** — `i18n`, `shared`, `seo`, notifications, file upload.
- **P4** — `scaffold` CLI + in-place `pnpm setup`, docs polish.
- **Optional** — outbox, desktop/n8n/docs app shells.

---

## Verification

```bash
pnpm install
pnpm lint
pnpm check-types
pnpm build
pnpm test
# codegen (API must be running)
pnpm generate
```

### Manual smoke test

- [ ] Example `items` list loads, create/edit/delete work.
- [ ] OpenAPI types regenerate and client stays in sync.
- [ ] RBAC guard blocks a user without the resource permission.
- [ ] i18n renders in ar (RTL) and en.
- [ ] Error envelope renders correctly in the UI.
- [ ] `create-core-app` produces a buildable project with the example removed.

---

## Out of scope

- Migrating `e-dukan` / `erp`.
- Domain features (products, orders, accounting, invoicing, catalog).
- npm publishing / private registry distribution.
- Fleshing out the optional app shells (desktop/n8n/docs) beyond scaffolding.

---

## Open questions

- [ ] Optional capabilities default set — **Decision:** include import/export, seo, shared, file upload, notifications as core/toggleable; desktop/n8n/docs shells optional. (Owner dismissed the enumeration prompt; defaulted here.)
- [ ] Node/pnpm/turbo version floor — **Decision:** pnpm 9, Node ≥ 20, turbo ≥ 2.7. (Confirm during P0.)

---

## Approval

- [ ] Design reviewed by: ___
- [ ] Approved on: ___
