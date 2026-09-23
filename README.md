# platform-core

Turborepo template with the shared, domain-free core used to scaffold new projects.

## Quick start

```bash
pnpm install
pnpm build
pnpm generate   # regenerate OpenAPI types (API must be running)
```

See `docs/superpowers/specs/2026-09-22-platform-core-design.md` for the design.

## Scaffolding a new project

```bash
# From a clone of platform-core: copy the template into ./my-app
node packages/scaffold/bin/create-core-app.mjs my-app

# Or, if you cloned the template yourself, set it up in place
pnpm setup
```

Both prompt for project name, package scope (`@core` → your scope), and whether to
keep the dashboard UI / auth packages. They then prune the `items` example slice,
rename the scope, and reset git.

Then:

```bash
cd my-app
pnpm install
cp apps/api/.env.example apps/api/.env
cp packages/db-prisma/.env.example packages/db-prisma/.env
pnpm --filter @core/db-prisma db:migrate:dev
pnpm --filter @core/api dev
pnpm --filter @core/dashboard dev
```

Non-interactive (CI): set `SCAFFOLD_NAME`, `SCAFFOLD_SCOPE`, `SCAFFOLD_KEEP_UI`,
`SCAFFOLD_KEEP_AUTH`.

> `pnpm generate resource <name>` (scaffold a new vertical slice) is planned but not yet implemented.

## Packages

| Package | Purpose |
|---------|---------|
| `@core/db-prisma` | Prisma client plumbing + `PrismaModule` + seed harness |
| `@core/api-contracts` | Response envelope, resource primitives, filter DSL, generated OpenAPI types |
| `@core/backend-core` | NestJS CRUD kernel (repository/service/controller/presenter), RBAC, import/export |
| `@core/api-client` | `openapi-fetch` client, `CrudClient`, React Query hooks |
| `@core/auth` | Cookie-JWT toolkit (`./next`, `./nest`, `./react`, `./middleware`) |

## Golden reference: items slice (EXAMPLE)

```
packages/db-prisma/prisma/schema.prisma            # Item model
packages/api-contracts/src/resources/items.resource.ts
apps/api/src/modules/example/items/                # repository / service / presenter / controller
packages/api-client/src/clients/items.client.ts
```

The example is removed by the scaffold CLI. Delete it manually for a clean project.

## Codegen

`pnpm generate` boots the API in-process, writes `apps/api/openapi.yaml`, and
regenerates `packages/api-contracts/types/index.ts`. Never edit those types by hand.

## Verification

```bash
pnpm lint && pnpm check-types && pnpm build && pnpm test
```
