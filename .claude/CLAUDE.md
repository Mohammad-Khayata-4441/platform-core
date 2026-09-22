# Claude Code — ERP Workflow

You are working in the **platform-core** monorepo. Follow this workflow unless the user overrides.

## Before coding

1. Load rules and skills referenced in root `CLAUDE.md` (via `@` imports).
2. For **non-trivial features**: check `docs/superpowers/specs/` → write or follow an approved design spec.
3. For **full disciplined cycles**: invoke skill **`caveman`** or `/caveman`.
4. For **where files live**: skill **`project-map`**.

## Spec-driven development (HARD-GATE)

- Design specs: `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
- Plans: `docs/superpowers/plans/YYYY-MM-DD-<topic>.md`
- Templates: `docs/superpowers/templates/`
- **No implementation** until the design spec is explicitly approved.

## Stack reminder

`Prisma` → `api-contracts` → `NestJS API` → `api-client` → `dashboard module (generateResource)`

Golden CRUD reference: **units** (see `AGENTS.md`).

## Verification commands

```bash
pnpm --filter @core/api dev
pnpm --filter @core/dashboard dev
pnpm turbo run build --filter=@core/api
pnpm turbo run build --filter=@core/dashboard
pnpm --filter @core/db-prisma db:migrate:dev
pnpm generate:dev   # after API DTO/Swagger changes — API must be running
```

Never claim work is done without running verification and citing output.

## Superpowers plugin

Enabled in `.claude/settings.json`. Use for brainstorming, writing/executing plans, systematic debugging, and verification-before-completion.

## Team docs

- [docs/ai-engineering.md](docs/ai-engineering.md)
- [docs/superpowers/README.md](docs/superpowers/README.md)
- [.claude/README.md](.claude/README.md)
