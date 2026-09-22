---
name: code-quality
description: ERP code-quality gates — surgical changes, verify-before-complete, lint-and-validate. Load always.
scope: always
---

# ERP Code Quality — Always Loaded

Three behavioral gates imported from `sickn33/antigravity-awesome-skills`
(licensed MIT). Apply on every code change in this repo.

---

## 1. Surgical changes (`andrej-karpathy`)

- Make the **smallest change** that solves the problem. No drive-by refactors.
- **Surface hidden assumptions** explicitly in the plan / commit / response.
- Define "done" with **verifiable success criteria** BEFORE writing code.
- Prefer the existing pattern over a new abstraction. Boring > clever.
- Tradeoff: these rules bias toward caution over speed. For trivial
  edits (typo, single-line tweak) use judgment.

Full body: `.ai/skills/_imports/andrej-karpathy/SKILL.md`

---

## 2. Verify before completion (`verification-before-completion`)

- **Never claim a task is done** without running it / inspecting the output.
- "I think it works" = "it does not work" until proven by output, not by reasoning.
- Verification tiers (use the strongest that's reasonable):
  1. File / import parses (typecheck)
  2. Unit test passes
  3. Integration / e2e test passes
  4. Manual smoke in `pnpm dev`

Full body: `.ai/skills/_imports/verification-before-completion/SKILL.md`

---

## 3. Lint & validate (`lint-and-validate`)

After every meaningful edit, **run the relevant validation** for the touched
package. The exact commands live in each package's `package.json`, but the
defaults for this monorepo are:

```bash
# After touching apps/api/** DTOs, controllers, or Swagger decorators — MANDATORY
# (see api.md for the full decorator requirements and why this matters)
pnpm generate:dev                              # requires API running in another terminal
pnpm --filter @core/api-contracts build  # makes new types available to dashboard

# After touching apps/api/** (non-DTO changes)
pnpm --filter @core/api lint
pnpm --filter @core/api test

# After touching apps/dashboard/**
pnpm --filter @core/dashboard lint
pnpm --filter @core/dashboard test

# After touching packages/db-prisma/**
pnpm --filter @core/db-prisma typecheck
pnpm --filter @core/db-prisma db:migrate:dev

# After touching packages/api-contracts or packages/api-client
pnpm --filter @core/api-contracts build
pnpm --filter @core/api-client build

# Whole repo (when in doubt)
pnpm turbo run lint typecheck build
```

If any of the above fails, **fix it before reporting completion** — do not
defer, do not mark "known issue", do not move on.

Full body: `.ai/skills/_imports/lint-and-validate/SKILL.md`

---

## 4. OpenAPI-generated types — no workarounds

The app uses an OpenAPI generator. All backend API types live in
`packages/api-contracts/src/types/` and are **auto-generated** — never hand-authored.

**Command:**
```bash
pnpm generate:dev   # regenerates packages/api-contracts/src/types/ from the running API spec
```

### Hard rules (no exceptions)

- **Never** use `as any`, `as unknown as X`, `@ts-ignore`, or `@ts-expect-error`
  to paper over a type error involving API request/response data.
- **Never** redefine an API shape inline (inside a component, hook, or service file).
- **Never** use workarounds like `Record<string, unknown>`, local interfaces, or
  re-declaring fields that should come from generated types.
- **Never** import a type from `packages/api-contracts/src/types/` directly —
  consume it through the typed utilities in `packages/api-contracts/src/api/`
  (`ApiResponse`, `ApiRequestBody`, `ApiQueryParams`, etc.).

### When you hit a type error on API data

1. **Run `pnpm generate:dev`** — the spec may have changed since last generation.
2. Confirm the type is exported from `packages/api-contracts` and import it.
3. If the type is still wrong or missing, fix the source (resource definition,
   NestJS DTO, or Swagger decorator), then regenerate — do not patch the consumer.
4. Build `packages/api-contracts` after regeneration:
   ```bash
   pnpm --filter @core/api-contracts build
   ```

Treating a stale or missing generated type as a reason to write a workaround is
a code-quality violation on the same level as skipping tests.

---

## What this rule does NOT do

- It does **not** override the path-scoped rules in `.ai/rules/api.md`,
  `.ai/rules/dashboard.md`, `.ai/rules/database.md`, `.ai/rules/packages.md`,
  or the cross-cutting `.ai/rules/monorepo.md`. Those still load with the
  files they cover.
- It does **not** promote any of the 25 other imported skills to
  always-loaded. Those stay in `.ai/skills/_imports/` and load on-demand
  by their `name`.
