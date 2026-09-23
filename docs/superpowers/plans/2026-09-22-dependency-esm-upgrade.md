# Platform Core — Dependency & ESM Upgrade (Nest 12 / Next 16 / TS 7) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `platform-core` to current stable/major versions — NestJS 12 (ESM-first), Next.js 16, React 19.3, TypeScript 7, Vitest, Tailwind 4.3, next-intl 4.14 — and migrate `apps/api` + the backend packages to true ESM.

**Architecture:** Nest 12 packages ship as ESM; we convert `apps/api` (and the core backend packages it imports at runtime) to `"type": "module"` with `NodeNext` resolution and explicit `.js` import specifiers, so imports are statically resolvable rather than relying on `require(esm)` interop across CJS re-exports. Tests move from Jest/ts-jest to Vitest (Nest 12's default for ESM; Vitest is esbuild-based so it works without the TypeScript compiler API). Lint moves from ESLint+typescript-eslint to **oxlint** (no TS-API dependency) because TS 7.0 ships without a stable compiler API until 7.1.

**Tech Stack:** Node ≥ 22.12 (have 24), pnpm 10, TypeScript 7.0, NestJS 12, Next.js 16, React 19.3, Vitest 4, oxlint, Tailwind 4.3, next-intl 4.14, Prisma 7.10.

## Global Constraints

- **Prisma stays 7.10** (Prisma 8 is an RC with a different ORM; not adopted).
- **TS 7.0 has no stable compiler API** — no `ts-jest`, no `typescript-eslint`. Vitest + oxlint replace them.
- **Next.js `next build` type-checking** may not support TS 7's missing API; if it fails, set `typescript.ignoreBuildErrors: true` and rely on the `check-types` (`tsc --noEmit`) gate.
- The `items` example slice must still build and its API e2e test must pass after the migration.
- `pnpm lint && pnpm check-types && pnpm build && pnpm test` green at each phase end.
- No domain logic changes — this is a tooling/runtime upgrade only.

---

## Phase 1: Root tooling (TypeScript 7, oxlint, Vitest)

**Files:** root `package.json`, `turbo.json`, `.github/workflows/ci.yml`, `packages/eslint-config` (retire), new `oxlint` config.

- [ ] Bump root `typescript` → `7.0.0`; add `oxlint` devDep; change root `lint` to `oxlint`.
- [ ] Remove `@core/eslint-config` usage (keep the package but drop it from consumer deps / CI).
- [ ] Update CI `lint` step to `oxlint`.
- [ ] Verify: `pnpm lint`, `pnpm check-types` across untouched packages.

## Phase 2: NestJS 12 + ESM (backend packages + apps/api)

**Files:** `apps/api/**`, `packages/{backend-core,db-prisma,api-contracts,auth}/**`, all `package.json`/`tsconfig.json`.

- [ ] Bump `@nestjs/*` → `^12.0.4` (common, core, platform-express, swagger, config, cli, schematics, testing); Node engines → `>=22.12`.
- [ ] `apps/api` → ESM: `"type": "module"`, tsconfig `module: nodenext`/`moduleResolution: nodenext`, add `.js` to every relative import, `import.meta.dirname` if needed.
- [ ] Convert `backend-core`, `db-prisma`, `api-contracts` to ESM (add `.js` extensions to relative imports; `"type":"module"`).
- [ ] Replace `ts-node` in `generate:spec` with `tsx` (esbuild; no TS API) or run compiled output.
- [ ] Migrate `apps/api` tests Jest → Vitest (`*.spec.ts`, e2e), delete `jest`/`ts-jest` config.
- [ ] Verify: `pnpm --filter @core/api build`, `test`, `test:e2e`, `pnpm generate`.

## Phase 3: Next.js 16 + React 19.3

**Files:** `apps/dashboard/**`, `packages/{ui,i18n,seo,auth,api-client}/package.json`.

- [ ] Bump `next` → `16.3.5`, `react`/`react-dom` → `19.3.0`, `@types/react*` → latest.
- [ ] Drop `--turbopack` flags (default in 16); confirm Turbopack build.
- [ ] next-intl → `4.14.2`. Confirm `layout.tsx` async request usage compiles.
- [ ] Verify: `pnpm --filter @core/dashboard build`.

## Phase 4: Tailwind 4.3 + misc

- [ ] `tailwindcss` / `@tailwindcss/postcss` → `4.3.3`.
- [ ] Prisma → `7.10.0`.
- [ ] Bump remaining radix/lucide/etc. to latest compatible.
- [ ] Verify: `pnpm --filter @core/dashboard build`.

## Phase 5: Full verification + docs

- [ ] `pnpm install && pnpm lint && pnpm check-types && pnpm build && pnpm test` all green.
- [ ] Update `AGENTS.md` (Node ≥ 22.12, TS 7, Vitest, oxlint) and `README.md` (stack versions).
- [ ] Commit.

---

## Self-Review Notes

- **Risk:** full ESM across the backend is the largest change; appending `.js` specifiers is mechanical but broad. Verify per package.
- **Risk:** TS 7 + Next build type-check; mitigated by `ignoreBuildErrors` + `tsc --noEmit` gate.
- **Not in scope:** Prisma 8 (RC), push notifications, file upload.
