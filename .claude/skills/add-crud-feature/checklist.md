# Full-Stack CRUD Checklist

## Database
- [ ] Prisma model in `packages/db-prisma/src/schema/`
- [ ] Migration applied (`pnpm --filter @core/db-prisma db:migrate:dev`)
- [ ] Seed updated (idempotent)

## API contracts
- [ ] `*.resource.ts` with `defineCrudResource` (5 routes)
- [ ] `*.dto.ts` (Create, Update, List if needed)
- [ ] Exported from `resources/index.ts` and `dto/index.ts`
- [ ] Added to `resources` map

## NestJS API
- [ ] `dto/`, `events/`, `repositories/`, `presenters/`, `services/`, `controllers/`
- [ ] `resourceName = resources.{key}.key`
- [ ] Controller uses `createStandardCrudControllerBase`
- [ ] Feature module registered in domain module
- [ ] `JwtAuthGuard` on controller

## API client
- [ ] `*Client extends CrudClient<typeof resource>`
- [ ] Registered in `api.ts` factory

## Dashboard
- [ ] `*.resource.ts` — `generateResource<Client>`
- [ ] `*.config.ts` — zod + defaults + mapper
- [ ] `*-page.tsx`, `*-form.tsx`, `*-columns.tsx`
- [ ] Page uses `Resource.Page` + `actions` (`FormDialog`) + `Resource.Table`
- [ ] Columns use `ColumnHeader`; boolean fields use `BooleanCell`
- [ ] Custom toolbar only if needed: `Toolbar.Start` / `.Center` + `actions` for `.End`
- [ ] `index.ts` barrel
- [ ] Thin `page.tsx` under `app/[locale]/(authenticated)/`
- [ ] `navGroups.tsx` entry
- [ ] i18n keys in `messages/` (`en`, `ar`, `tr`) under `system.*`
- [ ] Breadcrumb slot if detail page (`@breadcrumbs/`)

## QA
- [ ] API list/show/create/update/delete work
- [ ] Dashboard table + form dialog work
- [ ] Types compile (`pnpm turbo run check-types`)
