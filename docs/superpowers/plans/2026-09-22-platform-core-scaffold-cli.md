# Platform Core — Scaffold CLI (P4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `platform-core` consumable: a `create-core-app` CLI that copies the template into a new directory and an in-place `pnpm setup` that renames the scope, prunes the `items` example, and resets git.

**Architecture:** One dependency-free Node ESM module (`scripts/scaffold.mjs`) holds all transform logic. `scripts/setup.mjs` runs it in place; `packages/scaffold` exposes a `create-core-app` bin that copies the repo to a target then runs the same logic there. Prompts use Node's `readline` (no external deps).

**Tech Stack:** Node ≥ 20 ESM, `node:fs`, `node:readline`, `node:child_process`.

## Global Constraints

- Scope is **`@core/*`** by default; the CLI rewrites it to the user's chosen scope.
- **No new runtime dependencies** for the CLI (Node stdlib only).
- The CLI must never run destructive git operations without the user having created a fresh target (create path) or explicitly confirming (in-place path).
- After scaffolding, `pnpm install && pnpm lint && pnpm check-types` must succeed on the new project.
- Example-slice removal must be exhaustive (DB model, contracts, API module, client, dashboard module, tests, wiring).

---

## File Structure

```
scripts/
  scaffold.mjs            # shared transform logic + prompts
  setup.mjs               # in-place entrypoint (calls scaffold.mjs with cwd)
packages/scaffold/
  package.json            # @core/scaffold, bin: create-core-app
  bin/create-core-app.mjs # copy repo -> target, then run scaffold there
  README.md
```

---

## Task 1: Shared scaffold module

**Files:**
- Create: `scripts/scaffold.mjs`

**Interfaces:**
- Produces: `scaffold({ root, name, scope, keepUi, keepAuth, resetGit, install })` → `Promise<void>`; `prompt(questions)` helper.

- [ ] **Step 1: Implement prompts + transforms**

Implement `scaffold.mjs` exporting `scaffold(opts)` that:
1. **Rename scope:** walk `**/package.json` + all `*.ts/tsx/md/mdc/json` under `apps/`, `packages/`, `.ai/`, `.cursor/`, `.claude/`, `AGENTS.md`, `CLAUDE.md`, `opencode.json`, replacing `@core/` → `@{scope}/` (skip `node_modules`, `dist`, `.next`, `.turbo`, `generated`).
2. **Rename root:** set root `package.json.name` → `{name}`.
3. **Prune example slice:** delete
   - `apps/api/src/modules/example` (dir) and remove `ItemsModule` import/registration from `apps/api/src/app.module.ts`
   - `apps/api/test/items.e2e-spec.ts`
   - `packages/api-client/src/clients/items.client.ts`, `items.client.spec.ts`, and rewrite `clients/index.ts` to `export {}`
   - `packages/api-contracts/src/resources/items.resource.ts` and its export in `resources/index.ts`
   - `packages/api-contracts/src/dto/item.dto.ts` and its export in `dto/index.ts`
   - `apps/dashboard/src/modules/items` (dir), `apps/dashboard/src/app/(dashboard)/items` (dir)
   - the `Item` model + `@@unique` block from `packages/db-prisma/prisma/schema.prisma`; delete `packages/db-prisma/prisma/migrations/*add_item_example*`
   - remove `{ items: new ItemsClient(http) }` from `apps/dashboard/src/config/api.ts` and the `ItemsClient` import; make `buildApi` return `createApi({})`
   - remove `Items` nav entry from `apps/dashboard/src/config/navigation.ts`
4. **Optional packages:** if `!keepUi`, delete `packages/ui` + `apps/dashboard` and remove `@scope/ui`/`@scope/dashboard` from workspace refs; if `!keepAuth`, delete `packages/auth`.
5. **Env:** write `apps/api/.env.example` (already present) and ensure `.env` files are absent.
6. **Reset git:** if `resetGit`, remove `.git` and run `git init -q`.
7. **Install:** if `install`, run `pnpm install`.

- [ ] **Step 2: Implement `prompt()`**

Readline-based multi-question helper returning `{ name, scope, keepUi, keepAuth }` with defaults (`name` = target dir name, `scope` = `core`).

- [ ] **Step 3: Verify the module parses**

Run: `node --check scripts/scaffold.mjs`
Expected: no output (valid syntax).

- [ ] **Step 4: Commit**

```bash
git add scripts/scaffold.mjs
git commit -m "feat(scaffold): add shared scaffold transform module"
```

---

## Task 2: In-place `pnpm setup`

**Files:**
- Create: `scripts/setup.mjs`
- Modify: root `package.json` (add `"setup": "node scripts/setup.mjs"`)

**Interfaces:**
- Consumes: `scaffold` from Task 1.
- Produces: `pnpm setup` that runs `scaffold({ root: process.cwd(), ...prompted, resetGit: true, install: false })`.

- [ ] **Step 1: Write `scripts/setup.mjs`**

```js
import { scaffold, prompt } from './scaffold.mjs';

const answers = await prompt({ defaultName: 'my-app' });
await scaffold({ root: process.cwd(), ...answers, resetGit: true, install: false });
console.log('Done. Run: pnpm install');
```

- [ ] **Step 2: Add root script**

Add `"setup": "node scripts/setup.mjs"` to `package.json` scripts.

- [ ] **Step 3: Verify syntax**

Run: `node --check scripts/setup.mjs`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add scripts/setup.mjs package.json
git commit -m "feat(scaffold): add in-place pnpm setup"
```

---

## Task 3: `create-core-app` CLI

**Files:**
- Create: `packages/scaffold/package.json`, `packages/scaffold/bin/create-core-app.mjs`, `packages/scaffold/README.md`

**Interfaces:**
- Consumes: `scaffold`, `prompt` from the repo's `scripts/scaffold.mjs` (resolved relative to the CLI's repo root).
- Produces: `create-core-app <dir>` bin.

- [ ] **Step 1: Write `bin/create-core-app.mjs`**

- Parse `argv[2]` as target dir (default prompted).
- Resolve the template root as the directory two levels up from the bin (`packages/scaffold/bin` → repo root).
- Recursively copy the repo to the target, skipping `node_modules`, `.git`, `.next`, `dist`, `.turbo`, `generated`.
- `process.chdir(target)`, then import the copied `scripts/scaffold.mjs` and run `scaffold({ root: target, ...answers, resetGit: true, install: false })`.
- Print next steps.

- [ ] **Step 2: Write `packages/scaffold/package.json`**

```json
{
  "name": "@core/scaffold",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "bin": { "create-core-app": "./bin/create-core-app.mjs" },
  "scripts": { "build": "echo skip", "lint": "echo skip", "check-types": "echo skip", "test": "echo skip" },
  "engines": { "node": ">=20" }
}
```

- [ ] **Step 3: Write README** with usage (copy + setup + generate resource note).

- [ ] **Step 4: Verify syntax + dry run in a temp copy**

Run: `node --check packages/scaffold/bin/create-core-app.mjs`
Run a non-interactive dry run against a temp copy: copy `platform-core` → `%TEMP%\pc-scaffold-test`, run the CLI with env-provided answers (`SCAFFOLD_NAME`, `SCAFFOLD_SCOPE`, `SCAFFOLD_KEEP_UI=1`), then assert:
- `packages/ui` gone or kept per flag,
- no `@core/` remains in `packages/*/package.json`,
- `apps/api/src/modules/example` gone,
- `apps/api/src/app.module.ts` has no `ItemsModule`.
Add env-var fallbacks to `prompt()` so it is testable non-interactively.

- [ ] **Step 5: Commit**

```bash
git add packages/scaffold
git commit -m "feat(scaffold): add create-core-app CLI"
```

---

## Task 4: Docs + `generate resource` note

**Files:**
- Modify: `README.md`, `AGENTS.md`

- [ ] **Step 1: Document the CLI**

Add a "Scaffolding a new project" section to `README.md` (create-core-app + pnpm setup + manual steps) and reference it from `AGENTS.md`.

- [ ] **Step 2: Commit**

```bash
git add README.md AGENTS.md
git commit -m "docs: document the scaffold CLI"
```

---

## Self-Review Notes

- **Spec coverage:** P4 = `create-core-app` CLI (Task 3) + in-place `pnpm setup` (Task 2) + docs (Task 4). The optional `pnpm generate resource <name>` generator is **noted in docs** but deferred (it needs the codegen + contracts to be running; a follow-up).
- **Testability:** `prompt()` gains env-var fallbacks so the CLI can be verified non-interactively in a temp copy without full `pnpm install`.
- **Safety:** the create path always works on a fresh target; the in-place path requires an explicit confirmation prompt before deleting `.git`/example code.
