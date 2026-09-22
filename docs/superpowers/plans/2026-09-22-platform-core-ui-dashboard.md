# Platform Core — UI + Dashboard Milestone (P2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the reusable frontend layer into `@core/ui` (shadcn primitives, RHF form architecture, `generateResource` compound CRUD, and e-dukan's `DashboardPage` shell) and stand up `apps/dashboard` — a Next.js App Router skeleton wired to `@core/api-client` that renders the `items` example with `generateResource`.

**Architecture:** `@core/ui` exports source `.ts`/`.tsx` directly (no build step for consumers), consumed by Next.js via `transpilePackages`. It contains no domain logic: permission maps, navigation, and API clients are injected by the app. `apps/dashboard` composes providers (`QueryClient`, `ApiProvider`, confirm/toast, theme) + the dashboard shell, and defines resources with `generateResource`.

**Tech Stack:** Next.js 15.5 (App Router), React 19, Tailwind CSS v4, shadcn/Radix, TanStack Query v5 + Table v8, react-hook-form, zod, nuqs, sonner.

## Global Constraints

- Scope is **`@core/*`**; repo root is **`platform-core`**. Paths are relative to the repo root.
- **No domain terms** in `@core/ui` (no order/product/invoice/accounting). The `items` slice is the only example and lives in `apps/dashboard`.
- **No hardcoded UI copy** in `@core/ui` — user-facing strings must be props or i18n-ready keys. (i18n wiring itself is P3; P2 may pass English strings from the app.)
- **No frontend package may import `@core/db-prisma`.**
- **`@core/ui` must not import from `apps/*`.** Dependencies point only to `@core/api-client`, `@core/api-contracts`, `@core/auth`.
- Permission maps, navigation trees, and API client maps are **injected by the app**, never hardcoded in `@core/ui`.
- Next.js baseline: **15.5**, React **19.2**, Tailwind **v4**.
- Every task ends green on `pnpm lint`, `pnpm check-types`, `pnpm build` (or the task's stated subset) before its commit.
- Source repos (read-only): `../e-dukan` and `../devloggers/erp`.

---

## File Structure (created/modified by this plan)

```
packages/ui/                          # @core/ui
  package.json  tsconfig.json
  src/
    index.ts
    lib/cn.ts
    shadcn/**                         # primitives (radix/shadcn)
    form/**                           # RHF architecture (from erp shared/components/form)
    hooks/**                          # form controllers, use-mobile, etc.
    data-view/**                      # generateResource compound + table-view + filter
    layouts/dashboard/**              # DashboardPage shell (from e-dukan)
    dashboard-stats/overview-cards.tsx
apps/dashboard/                       # @core/dashboard
  package.json  tsconfig.json  next.config.*  postcss.config.*  tailwind css entry
  app/
    layout.tsx  globals.css  page.tsx
    (dashboard)/layout.tsx  (dashboard)/items/page.tsx
  modules/items/**                    # example resource (generateResource)
  infrastructure/providers.tsx
  config/api.ts  config/navigation.ts
  lib/query.ts
```

---

## Task 1: `@core/ui` scaffold + primitives

**Files:**
- Create: `packages/ui/package.json`, `packages/ui/tsconfig.json`, `packages/ui/src/index.ts`, `packages/ui/src/lib/cn.ts`
- Create: `packages/ui/src/shadcn/**` (ported)
- Create: `packages/ui/src/dashboard-stats/overview-cards.tsx`

**Interfaces:**
- Consumes: `@core/api-client`, `@core/api-contracts`.
- Produces: `cn`, the shadcn component surface, `StatCard`/`OverviewCardsGrid`.

- [ ] **Step 1: Port the shadcn primitives**

Copy `../devloggers/erp/apps/dashboard/shared/components/ui/*` → `packages/ui/src/shadcn/`. Keep filenames. These are generic (button, card, dialog, sheet, table, select, command, combobox, sidebar, chart, form, etc.).

- [ ] **Step 2: Port `cn` and the overview cards**

Copy `../devloggers/erp/apps/dashboard/shared/lib/utils.ts` → `packages/ui/src/lib/cn.ts` (keep the `cn` export; drop app-specific helpers). Copy `../e-dukan/packages/ui/src/dashboard-stats/overview-cards.tsx` → `packages/ui/src/dashboard-stats/overview-cards.tsx`. **Do not** copy `order-stats-cards.tsx` / `order-status-chart.tsx` (domain).

- [ ] **Step 3: Write `packages/ui/src/index.ts`**

```ts
export * from './lib/cn';
export * from './dashboard-stats/overview-cards';
// shadcn primitives are imported by subpath: `@core/ui/shadcn/button`
```

- [ ] **Step 4: Write `packages/ui/package.json`**

```json
{
  "name": "@core/ui",
  "version": "0.0.0",
  "private": true,
  "exports": {
    ".": "./src/index.ts",
    "./shadcn/*": "./src/shadcn/*.tsx",
    "./form": "./src/form/index.ts",
    "./data-view": "./src/data-view/index.ts",
    "./layouts/dashboard": "./src/layouts/dashboard/index.ts",
    "./styles.css": "./src/styles.css"
  },
  "scripts": {
    "build": "tsc --noEmit",
    "dev": "tsc --watch",
    "lint": "echo skip",
    "check-types": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@core/api-client": "workspace:*",
    "@core/api-contracts": "workspace:*",
    "@hookform/resolvers": "^3.9.1",
    "@radix-ui/react-avatar": "^1.1.10",
    "@radix-ui/react-checkbox": "^1.1.5",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-popover": "^1.1.15",
    "@radix-ui/react-select": "^2.1.4",
    "@radix-ui/react-separator": "^1.1.7",
    "@radix-ui/react-slot": "^1.2.3",
    "@tanstack/react-query": "^5.95.2",
    "@tanstack/react-table": "^8.21.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.544.0",
    "nuqs": "^2.4.1",
    "react-hook-form": "^7.54.2",
    "sonner": "^2.0.7",
    "tailwind-merge": "^3.3.1",
    "zod": "^4.3.6"
  },
  "peerDependencies": {
    "next": ">=15",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@core/typescript-config": "workspace:*",
    "@types/react": "^19.2.2",
    "@types/react-dom": "^19.2.2",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "typescript": "5.9.2",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 5: Write `packages/ui/tsconfig.json`**

```json
{
  "extends": "@core/typescript-config/react-library.json",
  "compilerOptions": { "outDir": "./dist", "rootDir": "./src", "types": ["node"] },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
```

- [ ] **Step 6: Install + typecheck**

Run: `pnpm install`
Run: `pnpm --filter @core/ui check-types`
Expected: no errors (fix any imports in ported shadcn files that reference `@/` aliases → relative paths).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(ui): add shadcn primitives, cn, and overview cards"
```

---

## Task 2: `@core/ui` form architecture

**Files:**
- Create: `packages/ui/src/form/**` (ported from erp `shared/components/form`)
- Create: `packages/ui/src/hooks/{use-resource-form-controller.ts,use-resource-form.ts,use-form-mutation.ts,use-form-defaults.ts,apply-field-errors.ts,use-mobile.ts}`
- Modify: `packages/ui/src/index.ts`

**Interfaces:**
- Consumes: Task 1 primitives.
- Produces: `RhfForm`, `RhfField`, `FieldShell`, `ResourceFormShell`, control + field components, `useResourceFormController`.

- [ ] **Step 1: Port the form layer**

Copy `../devloggers/erp/apps/dashboard/shared/components/form/**` → `packages/ui/src/form/**` (keep `controls/`, `fields/`, `index.ts`). Copy `../devloggers/erp/apps/dashboard/shared/hooks/{use-resource-form-controller.ts,use-resource-form.ts,use-form-mutation.ts,use-form-defaults.ts,apply-field-errors.ts,use-mobile.ts}` → `packages/ui/src/hooks/`.

- [ ] **Step 2: Rewrite internal imports**

In every copied file replace `@/shared/components/ui/` → relative `../shadcn/`, `@/shared/components/form/` → `./`, `@/shared/hooks/` → `../hooks/`, `@/shared/lib/` → `../lib/`, `@/config/` → remove (see next step). Replace `@devloggers/api-client` → `@core/api-client`, `@devloggers/api-contracts` → `@core/api-contracts`.

- [ ] **Step 3: Remove app-config coupling**

Any import of `@/config/resource-permissions` or `@/config/navGroups` must be removed. Where a permission or navigation value was read, accept it as a prop/argument instead. `use-resource-form-controller` must not import app config.

- [ ] **Step 4: Export the form surface**

Append to `packages/ui/src/index.ts`:
```ts
export * from './form';
export { useResourceFormController } from './hooks/use-resource-form-controller';
export { useMobile } from './hooks/use-mobile';
```

- [ ] **Step 5: Write a smoke test**

Create `packages/ui/src/form/rhform.spec.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RhfForm } from './rhform';

describe('RhfForm', () => {
  it('renders its children', () => {
    render(<RhfForm onSubmit={() => {}}><span>hello</span></RhfForm>);
    expect(screen.getByText('hello')).toBeTruthy();
  });
});
```
Add `@testing-library/react`, `@testing-library/dom`, `jsdom` to `@core/ui` devDeps and a `vitest.config.ts` with `environment: 'jsdom'`. (Adjust the `RhfForm` props to the real ported signature.)

- [ ] **Step 6: Verify**

Run: `pnpm --filter @core/ui check-types` → no errors.
Run: `pnpm --filter @core/ui test` → PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(ui): add rhf form architecture and form hooks"
```

---

## Task 3: `@core/ui` data-view + `generateResource`

**Files:**
- Create: `packages/ui/src/data-view/**` (ported from erp `shared/data-view`)
- Create: `packages/ui/src/data-view/data-view-config.ts` (injected config types)
- Modify: `packages/ui/src/index.ts`

**Interfaces:**
- Consumes: Task 1–2.
- Produces: `generateResource`, `ResourceNamespace`, `UseResourceOptions`, `ResourceContext`, `ResourceItem`, the `table-view/*` primitives.

- [ ] **Step 1: Port the data-view layer**

Copy `../devloggers/erp/apps/dashboard/shared/data-view/**` → `packages/ui/src/data-view/**` (keep `resource/`, `table-view/`, `filter/`, `index.ts`). Copy `generate-resource.tsx` unchanged (its `ICrudClient` type comes from `@core/api-client`).

- [ ] **Step 2: De-domain the config coupling**

In `resource/resource-context.tsx` and `resource/use-resource.ts`, remove the `@/config/resource-permissions` import; accept an optional `permissions?: Record<string, string[]>` on the provider config instead. In `filter/resource-client-registry.ts`, remove the hardcoded three-resource map — accept a `resourceClients?: Record<string, ICrudClient>` from the provider.

- [ ] **Step 3: Add the injected-config types**

Create `packages/ui/src/data-view/data-view-config.ts`:
```ts
import type { ICrudClient } from '@core/api-client';

export interface ResourcePermissionConfig {
  /** resource key → required permission keys for create/update/delete. */
  [resourceKey: string]: { create?: string; update?: string; delete?: string };
}

export interface ResourceClientsConfig {
  /** resource key → CRUD client, used for FK filter lookups. */
  [resourceKey: string]: ICrudClient;
}
```
Thread both through `ResourceProvider` and the `generateResource` config.

- [ ] **Step 4: Export**

Append to `packages/ui/src/index.ts`:
```ts
export * from './data-view';
```

- [ ] **Step 5: Verify**

Run: `pnpm --filter @core/ui check-types` → no errors.
Run: `pnpm --filter @core/ui test` → PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(ui): add data-view and generateResource compound architecture"
```

---

## Task 4: `@core/ui` dashboard shell

**Files:**
- Create: `packages/ui/src/layouts/dashboard/**` (ported from e-dukan `@e-dukan/ui` layouts)
- Modify: `packages/ui/src/index.ts`

**Interfaces:**
- Consumes: Task 1 primitives.
- Produces: `DashboardPage` (+ `.Header/.Body/.Toolbar/.Section/.Card`), `DashboardProvider`/`useDashboard`, `ResponsiveDashboardLayout`, `DashboardHeader`, and the shell types (`DashboardNavItem`, `DashboardUser`, `DashboardStore`, `DashboardLink`, `DashboardNotification`, `DashboardShellProps`).

- [ ] **Step 1: Port the shell**

Copy `../e-dukan/packages/ui/src/layouts/dashboard/**` → `packages/ui/src/layouts/dashboard/**`. Files: `dashboard-context.tsx`, `dashboard-header.tsx`, `dashboard-page.tsx`, `desktop-dashboard-layout.tsx`, `mobile-dashboard-layout.tsx`, `responsive-dashboard-layout.tsx`, `types.ts`, `index.ts`.

- [ ] **Step 2: De-domain the shell**

- In `types.ts` / `dashboard-header.tsx`, remove the `Currency` coupling: replace `DashboardCurrency = Pick<Currency, …>` with a local `DashboardCurrency` interface (`{ code: string; symbol: string }`).
- Remove hardcoded `profileHref = "/profile"`; make it a `DashboardShellProps.profileHref` prop.
- Remove hardcoded Arabic strings; convert labels to props (e.g. `labels?: { logout: string; profile: string; ... }`). Default to English.

- [ ] **Step 3: Export**

Append to `packages/ui/src/index.ts`:
```ts
export * from './layouts/dashboard';
```

- [ ] **Step 4: Verify**

Run: `pnpm --filter @core/ui check-types` → no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): add dashboard shell and layout components"
```

---

## Task 5: `apps/dashboard` skeleton

**Files:**
- Create: `apps/dashboard/package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `src/app/globals.css`
- Create: `apps/dashboard/src/app/layout.tsx`, `src/app/page.tsx`
- Create: `apps/dashboard/src/app/(dashboard)/layout.tsx`
- Create: `apps/dashboard/src/infrastructure/providers.tsx`
- Create: `apps/dashboard/src/config/{api.ts,navigation.ts}`
- Create: `apps/dashboard/src/lib/query.ts`, `src/lib/api.ts`

**Interfaces:**
- Consumes: `@core/ui`, `@core/api-client`, `@core/api-contracts`, `@core/auth`.
- Produces: a running Next.js app with providers + dashboard shell; `getApi()` returns the app's `createApi` map; `navigation` drives the shell.

- [ ] **Step 1: Write `apps/dashboard/package.json`**

Port `../devloggers/erp/apps/dashboard/package.json` as a base, rename to `@core/dashboard`, set workspace deps to `@core/*`, and keep scripts `dev`, `build`, `start`, `lint`, `check-types`. Add `transpilePackages: ['@core/ui', '@core/api-client', '@core/api-contracts', '@core/auth']` in `next.config.ts`. Dependencies include `next`, `react`, `react-dom`, `@tanstack/react-query`, `nuqs`, `sonner`, `tailwindcss` + `@tailwindcss/postcss`, `next-themes`, `lucide-react`.

- [ ] **Step 2: Next/Tailwind config**

`next.config.ts`:
```ts
import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  transpilePackages: ['@core/ui', '@core/api-client', '@core/api-contracts', '@core/auth'],
};
export default nextConfig;
```
`postcss.config.mjs`:
```js
export default { plugins: { '@tailwindcss/postcss': {} } };
```
`src/app/globals.css`:
```css
@import 'tailwindcss';
@source '../../../packages/ui/src';
```

- [ ] **Step 3: App config + client map**

`src/config/api.ts`:
```ts
import { ApiClient } from '@core/api-client';
import { ItemsClient } from '@core/api-client/clients';
import { createApi } from '@core/api-client';

export function buildApi(baseUrl: string) {
  const http = new ApiClient(baseUrl);
  return createApi({ items: new ItemsClient(http) });
}
export type AppApi = ReturnType<typeof buildApi>;
```
(Note: export `ItemsClient` from `@core/api-client/clients` — already present.)

`src/lib/api.ts`:
```ts
'use client';
import { buildApi } from '@/config/api';
export const api = buildApi(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4040');
```

- [ ] **Step 4: Providers**

`src/infrastructure/providers.tsx`:
```tsx
'use client';
import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Toaster } from '@core/ui/shadcn/sonner';
import { ApiProvider } from '@core/api-client/react';
import { api } from '@/lib/api';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>
        <ApiProvider api={api}>{children}</ApiProvider>
        <Toaster />
      </NuqsAdapter>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 5: Root + dashboard layouts**

`src/app/layout.tsx` imports `./globals.css`, wraps children in `<Providers>`. `src/app/(dashboard)/layout.tsx` renders `<ResponsiveDashboardLayout>` with `navigation` from `@/config/navigation` and a demo user; wraps `<DashboardProvider>`.

`src/config/navigation.ts`:
```ts
import type { DashboardNavItem } from '@core/ui/layouts/dashboard';
export const navigation: DashboardNavItem[] = [
  { label: 'Items', href: '/items', icon: 'package' },
];
```
(Adjust to the exact `DashboardNavItem` shape from Task 4.)

- [ ] **Step 6: Verify build**

Run: `pnpm install`
Run: `pnpm --filter @core/dashboard check-types` → no errors.
Run: `pnpm --filter @core/dashboard build` → success.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(dashboard): add nextjs skeleton with providers and shell"
```

---

## Task 6: Items resource page + end-to-end verification

**Files:**
- Create: `apps/dashboard/src/modules/items/items.resource.tsx`
- Create: `apps/dashboard/src/modules/items/columns.tsx`
- Create: `apps/dashboard/src/modules/items/items-form.tsx`
- Create: `apps/dashboard/src/app/(dashboard)/items/page.tsx`
- Modify: `apps/dashboard/src/config/api.ts` (already includes items)

**Interfaces:**
- Consumes: Tasks 1–5; `ItemsClient`; `itemsResource`.
- Produces: a working `/items` list page with create/edit/delete.

- [ ] **Step 1: Define the resource**

`src/modules/items/items.resource.tsx`:
```tsx
'use client';
import { generateResource } from '@core/ui/data-view';
import type { ItemsClient } from '@core/api-client/clients';
import { columns } from './columns';
import { ItemsForm } from './items-form';

export const Items = generateResource<ItemsClient>({
  key: 'items',
  columns,
  formComponent: ItemsForm,
  labels: { title: 'Items', create: 'New item' },
});
```
(Match the exact `UseResourceOptions` fields from Task 3.)

- [ ] **Step 2: Columns + form**

`columns.tsx` — column defs for `sku`, `name.en`, `price`, `status` using the ported column helpers. `items-form.tsx` — an RHF form built from the ported controls (`text-input-field`, `number-input-field`, `select-field` for status).

- [ ] **Step 3: Page**

`src/app/(dashboard)/items/page.tsx`:
```tsx
'use client';
import { Items } from '@/modules/items/items.resource';

export default function ItemsPage() {
  return (
    <Items>
      <Items.Page />
    </Items>
  );
}
```
(Adjust to the real `ResourceNamespace` API.)

- [ ] **Step 4: Verify types + build**

Run: `pnpm --filter @core/dashboard check-types` → no errors.
Run: `pnpm --filter @core/dashboard build` → success.

- [ ] **Step 5: Manual smoke test**

Run the API (`pnpm --filter @core/api dev`) and dashboard (`pnpm --filter @core/dashboard dev`), open `/items`:
- [ ] List loads items from `/example/items`.
- [ ] Create / edit / delete work through `ItemsClient` + `generateResource`.
- [ ] Error envelope renders in the form (submit an invalid `sku` duplicate).

- [ ] **Step 6: Full milestone verification**

Run: `pnpm lint && pnpm check-types && pnpm build && pnpm test`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(dashboard): add items resource page (example)"
```

---

## Self-Review Notes

- **Spec coverage:** P2 = `@core/ui` (shadcn Task 1, forms Task 2, data-view/generateResource Task 3, shell Task 4) + `apps/dashboard` skeleton (Task 5) + items page (Task 6). This completes the UI side of the spec's data flow (`… → generateResource page`).
- **Deferred:** i18n (`@core/i18n`), `@core/shared`, `@core/seo`, notifications, file upload (P3); scaffold CLI (P4). The dashboard is English-only until P3.
- **Port tasks** carry exact source paths + adaptation lists; **novel tasks** carry complete code. Where the ported signatures must be confirmed, the step says so explicitly (adjust to the real signature).
- **Type consistency:** `ICrudClient` (api-client) → `generateResource<TClient>` (ui) → `Items` namespace (dashboard); `itemsResource` routes ↔ `ItemsClient`; `DashboardNavItem` (ui) → `navigation` (dashboard).
- **Known risks:** ported shadcn/form/data-view files import app aliases (`@/…`) that must be rewritten; `transpilePackages` must include every `@core/*` package; Tailwind v4 `@source` must point at `packages/ui/src` so classes are generated.
