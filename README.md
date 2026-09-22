# platform-core

Turborepo template with the shared, domain-free core used to scaffold new projects.

## Quick start

```bash
pnpm install
pnpm build
pnpm generate   # regenerate OpenAPI types (API must be running)
```

See `docs/superpowers/specs/2026-09-22-platform-core-design.md` for the design.

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
