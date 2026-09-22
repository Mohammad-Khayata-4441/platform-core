# ERP Repository Reference

## Root layout
```
erp/
├── apps/
│   ├── api/                 # NestJS (@core/api)
│   ├── dashboard/           # Next.js (@core/dashboard)
│   ├── desktop/
│   ├── docs/
│   └── web/
├── packages/
│   ├── api-contracts/       # @core/api-contracts
│   ├── api-client/          # @core/api-client
│   ├── backend-core/        # @core/backend-core
│   ├── db-prisma/           # @core/db-prisma
│   ├── ui/
│   ├── eslint-config/
│   └── typescript-config/
├── .ai/                     # AI rules & skills (canonical, portable)
│   ├── rules/               # monorepo, api, dashboard, database, code-quality
│   ├── skills/              # ERP workflows + _imports/ (28 upstream skills)
│   └── docs/                # forms-architecture.md
├── .cursor/                 # Cursor-specific AI config
│   ├── settings.json        # superpowers plugin enabled
│   ├── rules/               # tiered .mdc (global-rules/, api-rules/, core-rules/, …)
│   └── skills/              # mirrors .ai/skills/ for Cursor discovery
├── .claude/                 # Claude Code team config
│   ├── settings.json        # plugins, permissions, announcements
│   ├── CLAUDE.md            # workflow overlay
│   ├── README.md            # first-time Claude setup
│   └── skills/              # synced from .ai/skills (pnpm sync:claude)
├── CLAUDE.md                # Claude root memory (@ imports)
├── apps/api/CLAUDE.md       # path-scoped API rules
├── apps/dashboard/CLAUDE.md # path-scoped dashboard rules
├── packages/CLAUDE.md
├── packages/db-prisma/CLAUDE.md
├── docs/
│   ├── ai-engineering.md    # AI onboarding (humans + agents)
│   └── superpowers/         # spec-driven dev: specs/, plans/, templates/
├── reference/               # Product/docs reference material
├── turbo.json
├── pnpm-workspace.yaml
└── AGENTS.md
```

## `apps/api/src/`
```
apps/api/src/
├── app.module.ts
├── config/
├── common/
└── modules/
    ├── identity/       # auth, tenants, users, roles
    ├── catalog/        # units, items, item-categories
    ├── inventory/      # warehouses, stock-ledger, stock-counts
    ├── invoicing/      # invoices, payments, cashboxes, invoice-types
    ├── accounting/     # accounts, currencies, fiscal-periods, document-sequences
    ├── parties/
    ├── reports/
    ├── audit/
    └── ai-chat/
```

Standard feature folder:
```
modules/<domain>/<feature>/
├── controllers/
├── services/
├── repositories/
├── presenters/
├── dto/
├── events/
└── <feature>.module.ts
```

## `apps/dashboard/`
```
apps/dashboard/
├── app/
│   ├── layout.tsx
│   └── [locale]/
│       ├── layout.tsx
│       ├── (auth)/login/page.tsx
│       └── (authenticated)/
│           ├── layout.tsx
│           ├── page.tsx                    # home
│           ├── @breadcrumbs/             # parallel route
│           ├── catalog/
│           │   ├── units/page.tsx
│           │   ├── units/[id]/page.tsx
│           │   ├── categories/page.tsx
│           │   └── items/page.tsx
│           └── cashier/page.tsx
├── modules/            # feature UI (one folder per entity)
├── shared/             # reusable UI + data-view + hooks
├── infrastructure/     # layout, providers
├── config/navGroups.tsx
├── messages/en.json, tr.json
└── i18n/
```

Standard feature module:
```
modules/<feature>/
├── <feature>.resource.ts      # generateResource<Client>
├── <feature>.config.ts        # zod schema, defaults, mappers
├── components/
│   ├── <feature>-page.tsx
│   ├── <feature>-form.tsx
│   └── <feature>-columns.tsx
├── hooks/
└── index.ts
```

## `packages/api-contracts/src/`
```
resources/
├── base/crud-resource.ts
├── unit.resource.ts
├── item-category.resource.ts
└── index.ts          # exports `resources` map
dto/
└── *.dto.ts
```

## `packages/api-client/src/`
```
clients/*.client.ts   # CrudClient subclasses
api.ts                # createApi() factory
infra/crud-client.ts
```

## `packages/db-prisma/src/`
```
schema/
├── schema.prisma     # generator + datasource
├── unit.prisma
├── item.prisma
└── migrations/
seed/index.ts
```

## Dashboard routes: implemented vs planned

| Nav href (from navGroups) | Page exists? |
|---------------------------|--------------|
| `/` | Yes |
| `/cashier` | Yes |
| `/catalog/units` | Yes |
| `/catalog/categories` | Yes |
| `/catalog/items` | Yes (page stub) |
| `/invoices/*`, `/parties/*`, `/inventory/*`, `/finance/*`, `/reports/*`, `/settings/*` | Planned (nav only) |

## Dependency diagram
```
db-prisma
    ↓
backend-core ← api
    ↑
api-contracts
    ↓
api-client ← dashboard
```

## Commands
```bash
pnpm dev                                          # all apps
pnpm --filter @core/dashboard dev
pnpm --filter @core/api dev
pnpm turbo run build
pnpm --filter @core/db-prisma db:migrate:dev
pnpm --filter @core/db-prisma db:seed
```
