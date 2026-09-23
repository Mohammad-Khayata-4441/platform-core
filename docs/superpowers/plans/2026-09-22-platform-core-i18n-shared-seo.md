# Platform Core — i18n / shared / seo (P3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the remaining framework-level core packages — `@core/shared` (utils), `@core/i18n` (ar/en + RTL, next-intl + Nest wiring), and `@core/seo` (metadata/JSON-LD/sitemap/robots factories) — and replace `@core/ui`'s temporary i18n shim with real `next-intl` translations wired into `apps/dashboard`.

**Architecture:** `@core/i18n` owns the locale registry and message catalogs and exposes `next-intl` factories plus a Nest `I18nModule`/`I18nService`. `@core/ui`'s `lib/i18n.ts` re-exports `next-intl` hooks, so existing `useTranslations(...)` call sites start resolving real messages once an app provides `NextIntlClientProvider`. `@core/shared` and `@core/seo` are dependency-light utility packages.

**Tech Stack:** next-intl 4.x, zod, NestJS 11, Node ≥ 20.

## Global Constraints

- Scope **`@core/*`**; no domain terms in any `@core/*` package.
- **Locales:** `ar` + `en`, RTL-safe; extendable registry. `ar` is the default.
- No hardcoded user-facing strings in `@core/ui` — keys resolve through `next-intl`.
- `@core/i18n` must be usable from both Next.js (`next-intl`) and NestJS.
- Every task ends green on `pnpm lint`, `pnpm check-types`, `pnpm build`, `pnpm test`.
- **Deferred (out of P3):** push notifications/FCM and the file-upload subsystem — they need external services/credentials; tracked as a follow-up.

---

## File Structure

```
packages/shared/          # @core/shared
  src/{index.ts,utils/formatters/{currency,text,url}.ts,utils/subdomain.ts,react/{print-document,download-document}.ts}
packages/i18n/            # @core/i18n
  src/index.ts
  src/locales/{ar,en}/{system,common,auth,profile}.json
  src/next-intl/{routing,request,navigation,index}.ts
  src/nest/{i18n.module,i18n.service}.ts
packages/seo/             # @core/seo
  src/{index.ts,host.ts,hreflang.ts,types.ts,components/JsonLd.tsx,sitemap/factory.ts,robots/factory.ts,jsonld/{website,breadcrumb}.ts}
packages/ui/src/lib/i18n.ts   # re-export next-intl hooks
apps/dashboard/           # next-intl wiring
```

---

## Task 1: `@core/shared`

**Files:**
- Create: `packages/shared/package.json`, `tsconfig.json`, `src/**`
- Test: `packages/shared/src/utils/subdomain.spec.ts`

**Interfaces:**
- Produces: `formatCurrency`, `formatMoneyAmount`, `stripHtml`, `urlFormatter`, `extractSubdomain`, `printDocument`, `downloadDocument`.

- [ ] **Step 1: Port the utilities**

Copy from `../e-dukan/packages/shared/src/`:
- `utils/subdomain.ts`, `utils/formatters/currency.ts`, `utils/formatters/text.ts`, `utils/formatters/url.ts`
- `react/download-document.ts`, `react/print-document.ts`

Fix imports; remove any domain coupling.

- [ ] **Step 2: Write `src/index.ts`**

```ts
export * from './utils/subdomain';
export * from './utils/formatters/currency';
export * from './utils/formatters/text';
export * from './utils/formatters/url';
```

- [ ] **Step 3: Write `package.json` + `tsconfig.json`**

```json
{
  "name": "@core/shared",
  "version": "0.0.0",
  "private": true,
  "exports": { ".": "./src/index.ts", "./react": "./src/react/index.ts", "./utils/*": "./src/utils/*.ts" },
  "scripts": { "build": "tsc --noEmit", "lint": "echo skip", "check-types": "tsc --noEmit", "test": "vitest run" },
  "devDependencies": { "@core/typescript-config": "workspace:*", "@types/node": "^22.0.0", "typescript": "5.9.2", "vitest": "^2.1.8" },
  "peerDependencies": { "react": "^19.0.0" },
  "peerDependenciesMeta": { "react": { "optional": true } }
}
```
`tsconfig.json` extends `@core/typescript-config/react-library.json`, `rootDir: ./src`, includes `src`.

- [ ] **Step 4: Test**

`packages/shared/src/utils/subdomain.spec.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { extractSubdomain } from './subdomain';

describe('extractSubdomain', () => {
  it('returns the subdomain for a nested host', () => {
    expect(extractSubdomain('shop.example.com', 'example.com')).toBe('shop');
  });
  it('returns null for the apex host', () => {
    expect(extractSubdomain('example.com', 'example.com')).toBeNull();
  });
});
```
(Adjust to the real ported signature.)

- [ ] **Step 5: Verify + commit**

Run: `pnpm install && pnpm --filter @core/shared test && pnpm --filter @core/shared check-types`
```bash
git add -A && git commit -m "feat(shared): add formatters, subdomain, and document utils"
```

---

## Task 2: `@core/i18n`

**Files:**
- Create: `packages/i18n/package.json`, `tsconfig.json`, `src/**`

**Interfaces:**
- Produces: `locales`, `defaultLocale`, `getMessages(locale)`, `createNextIntlRouting()`, `createNextIntlRequestConfig()`, `createNextIntlNavigation()`, `I18nModule`, `I18nService.translate(key, locale)`.

- [ ] **Step 1: Write the message catalogs**

Create `src/locales/en/system.json` and `src/locales/ar/system.json` with the namespaces/keys `@core/ui` consumes: `booleanCell`, `confirm`, `dataView`, `resource`, `resourceFilter`, `resourceForm`, `resourcePagination`, `resourceSearch`, `selectionToolbar`, `tableActions` (keys from the inventory: `yes/no`, `placeholder`, `button`, `apply/clear`, `create/update/delete` + `deleteTitle/deleteDescription/deleteConfirm`, `created/updated/createFailed/updateFailed`, `rowsPerPage/firstPage/lastPage/nextPage/previousPage`, `sortAsc/sortDesc/clearSort`, `hideColumn/openMenu`, `operators.eq/like/gte/lte/in/isNull`, `selected`, `empty/emptyDescription`, etc.). Also `common.json` (`appName`, `save`, `cancel`), `auth.json`, `profile.json`.

- [ ] **Step 2: Write the registry + factories**

`src/index.ts`:
```ts
import enSystem from './locales/en/system.json';
import arSystem from './locales/ar/system.json';
// ...other namespaces
export const locales = ['ar', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'ar';
const catalogs = { en: { system: enSystem, /* ... */ }, ar: { system: arSystem, /* ... */ } };
export function getMessages(locale: Locale) { return catalogs[locale] ?? catalogs[defaultLocale]; }
```
`src/next-intl/routing.ts` → `createNextIntlRouting({ locales, defaultLocale })` returning `defineRouting(...)`.
`src/next-intl/request.ts` → `createNextIntlRequestConfig()` returning an async `getRequestConfig` that loads `getMessages`.
`src/next-intl/navigation.ts` → `createNextIntlNavigation(routing)`.
`src/next-intl/index.ts` re-exports the three.

- [ ] **Step 3: Nest adapter**

`src/nest/i18n.service.ts`:
```ts
@Injectable()
export class I18nService {
  constructor(@Inject(I18N_CONFIG) private readonly config: { locales: string[]; defaultLocale: string }) {}
  translate(key: string, locale: string): string {
    const messages = getMessages((locale as Locale)) as Record<string, unknown>;
    return key.split('.').reduce<unknown>((acc, part) => (acc as Record<string, unknown>)?.[part], messages) as string ?? key;
  }
  resolveLocale(acceptLanguage?: string): string { /* parse, fall back to default */ }
}
```
`src/nest/i18n.module.ts` → `@Global()` module providing `I18nService` with a configurable `I18N_CONFIG` token (defaults to the package locales).

- [ ] **Step 4: `package.json`**

Deps: `next-intl`, `zod`; peers `next`, `@nestjs/common`, `@nestjs/core` (optional). Exports: `.`, `./next-intl`, `./next-intl/*`, `./nest`, `./locales/*`.

- [ ] **Step 5: Test + verify + commit**

Test that `getMessages('ar')` and `getMessages('en')` return objects with a `system` key and that `I18nService.translate('system.confirm.delete', 'en')` is non-empty.
```bash
git add -A && git commit -m "feat(i18n): add locales, next-intl factories, and nest adapter"
```

---

## Task 3: Wire real translations into `@core/ui` + `apps/dashboard`

**Files:**
- Modify: `packages/ui/src/lib/i18n.ts`, `packages/ui/package.json`
- Create: `apps/dashboard/src/i18n/request.ts`, `apps/dashboard/middleware.ts`
- Modify: `apps/dashboard/src/app/layout.tsx`, `apps/dashboard/next.config.ts`, `apps/dashboard/package.json`

**Interfaces:**
- Consumes: `@core/i18n`.
- Produces: `@core/ui` hooks resolve real messages; dashboard renders in `ar` (RTL) by default with an `en` option.

- [ ] **Step 1: Point `@core/ui` at next-intl**

`packages/ui/src/lib/i18n.ts`:
```ts
export { useTranslations, useLocale } from 'next-intl';
```
Keep a `fallbackTranslator` export (the previous humanizer) for non-provider contexts. Add `next-intl` to `@core/ui` deps.

- [ ] **Step 2: Dashboard next-intl setup**

`apps/dashboard/next.config.ts` → wrap with `createNextIntlPlugin('./src/i18n/request.ts')`.
`apps/dashboard/src/i18n/request.ts`:
```ts
import { getRequestConfig } from 'next-intl/server';
import { getMessages, defaultLocale, locales, type Locale } from '@core/i18n';

export default getRequestConfig(async ({ locale }) => ({
  locale: (locales as readonly string[]).includes(locale ?? '') ? (locale as Locale) : defaultLocale,
  messages: getMessages(((locale ?? defaultLocale) as Locale)),
}));
```
`apps/dashboard/middleware.ts` → next-intl middleware from `@core/i18n/next-intl` (or cookie-based single-locale mode).

- [ ] **Step 3: Provide messages in the root layout**

`apps/dashboard/src/app/layout.tsx` → server component reads locale + messages and wraps `<Providers>` in `<NextIntlClientProvider locale={locale} messages={messages}>`. Set `<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>`.

- [ ] **Step 4: Verify**

Run: `pnpm --filter @core/dashboard build` → success; the items page renders Arabic labels (RTL) with no `system.*` keys visible.
Run: `pnpm --filter @core/ui check-types` → no errors.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(i18n): wire next-intl through @core/ui and the dashboard"
```

---

## Task 4: `@core/seo`

**Files:**
- Create: `packages/seo/package.json`, `tsconfig.json`, `src/**`

**Interfaces:**
- Produces: `resolveCanonicalHost`, `buildHreflang`, `JsonLd`, `createSitemap`, `createRobots`, `websiteJsonLd`, `breadcrumbJsonLd`.

- [ ] **Step 1: Port the generic seo pieces**

Copy from `../e-dukan/packages/seo/src/`: `host.ts`, `hreflang.ts`, `types.ts`, `components/JsonLd.tsx`, `sitemap/factory.ts`, `robots/factory.ts`, `jsonld/website.ts`, `jsonld/breadcrumb.ts`. **Do not** copy `jsonld/product.ts`, `metadata/product.ts`, `metadata/category.ts`, `metadata/store.ts`, `metadata/listing.ts` (domain). Fix imports; remove domain coupling.

- [ ] **Step 2: `src/index.ts` + `package.json` + `tsconfig.json`**

Export the ported surface. Deps: `next` (peer), `react` (peer), `zod` optional. Exports `.`, `./sitemap`, `./robots`.

- [ ] **Step 3: Test + verify + commit**

Add a unit test for `resolveCanonicalHost` / `buildHreflang`.
```bash
git add -A && git commit -m "feat(seo): add generic metadata, json-ld, sitemap, and robots factories"
```

---

## Task 5: Docs + full verification

**Files:**
- Modify: `README.md`, `AGENTS.md`

- [ ] **Step 1: Document the new packages**

Add `@core/shared`, `@core/i18n`, `@core/seo` to the package tables and note `ar`/`en` + RTL and the deferred notifications/upload work.

- [ ] **Step 2: Full verification**

Run: `pnpm lint && pnpm check-types && pnpm build && pnpm test`
Expected: all green.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "docs: document shared, i18n, and seo packages"
```

---

## Self-Review Notes

- **Spec coverage:** P3 = `@core/i18n` (Task 2, wired in Task 3), `@core/shared` (Task 1), `@core/seo` (Task 4), docs (Task 5). The temporary `@core/ui` i18n shim is replaced in Task 3.
- **Deferred:** notifications/FCM + file upload (external-service integrations) — called out in the Global Constraints and docs.
- **Risk:** next-intl wiring touches `@core/ui`'s translation hook; if provider-less contexts break, keep `fallbackTranslator` as the default export path and switch call sites incrementally.
