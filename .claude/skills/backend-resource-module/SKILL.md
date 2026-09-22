---
name: backend-resource-module
description: "Refactor or create a NestJS backend resource module following the 4-layer architecture (Repository → Service → Presenter → Controller) with DDD domain grouping, event-driven architecture, and full OpenAPI documentation. Use when: refactoring an existing module to the new architecture, creating a new resource module from scratch, adding a new entity to an existing domain (catalog, accounting, etc.), scaffolding CRUD backend for any resource."
---

# Backend Resource Module Generator

Scaffold or refactor a NestJS resource module following the established 4-layer architecture.
This skill applies to **all** resource modules in `apps/api/src/modules/`.

## Architecture Overview

```
Domain Module (e.g. catalog)
└── Resource Module (e.g. units)
    ├── dto/                     ← Input/Output DTOs (class-validator + @nestjs/swagger)
    ├── events/                  ← Typed domain events extending CrudEvent
    ├── repositories/            ← Data access layer (extends CrudRepository)
    ├── services/                ← Business logic (extends CrudService)
    ├── presenters/              ← Entity → Response mapping (extends CrudPresenter)
    └── controllers/             ← HTTP layer (createCrudController factory)
```

### Layer Responsibilities

| Layer | File | Responsibility |
|-------|------|---------------|
| Repository | `{resource}s.repository.ts` | All Prisma queries. Scoped to tenant. No business logic. |
| Service | `{resource}s.service.ts` | Business rules, validation hooks. Base class emits domain events. |
| Presenter | `{resource}.presenter.ts` | Maps Prisma entity → response DTO. Single responsibility. |
| Controller | `{resource}s.controller.ts` | HTTP class built from `createCrudController()` factory. |

### Key Infrastructure Packages

| Import | Purpose |
|--------|---------|
| `@core/backend-core` | `CrudRepository`, `CrudService`, `CrudPresenter`, `createCrudController`, `CrudOpenApi`, event classes |
| `@core/db-prisma` | Prisma entity types (e.g. `Unit`) |
| `@core/db-prisma/nest` | `PrismaService` for DI |
| `@core/api-contracts` | `resources` constant — provides the canonical `key` for each resource |

## When to Use

- "Refactor `currencies` module to the 4-layer architecture"
- "Create a new `warehouses` module with CRUD"
- "Add `item-categories` to the catalog domain"
- "Migrate `fiscal-periods` to use repository and presenter layers"

## Step-by-Step Procedure

Follow these steps **in order**. Read the [Reference Files](#reference-files) section before writing code.

---

### Step 1 — Identify the Domain

Determine which **domain module** the resource belongs to:

| Domain | Module path | Resources |
|--------|-------------|-----------|
| `catalog` | `modules/catalog/` | units, items, item-categories |
| `accounting` | `modules/accounting/` | fiscal-periods, document-sequences, currencies |
| `parties` | `modules/parties/` | customers, suppliers, contacts |
| `inventory` | `modules/inventory/` | warehouses, stock-ledger, stock-counts |
| `invoicing` | `modules/invoicing/` | invoices, invoice-types, payments |
| `auth` | `modules/auth/` | users, roles, tenants |

If the domain module doesn't exist yet, create it (see [Domain Module Template](#domain-module-template)).

If the domain already exists, add the new resource module to its `imports` and `exports` arrays.

---

### Step 2 — Read the Prisma Schema

Look at `packages/db-prisma/src/schema/{resource}.prisma` (or the generated `generated/client/schema.prisma`) to understand the entity fields.

The entity must have:
- `id: String @id @default(uuid())`
- `tenantId: String` (for tenant scoping)
- `createdAt: DateTime @default(now())`
- `updatedAt: DateTime @updatedAt`

Also verify the resource key in `packages/api-contracts/src/resources/{resource}.resource.ts`:

```typescript
// packages/api-contracts/src/resources/unit.resource.ts
export const unitResource = defineCrudResource({
  key: 'units',   // ← this is resources.units.key — use it in the service and events
  routes: { ... },
})
```

The `key` property is the canonical string for event names and `resourceName` in the service.

---

### Step 3 — Create DTOs

**File:** `modules/{domain}/{resource}/dto/{resource}.dto.ts`

Rules:
- `CreateXDto` — required fields only, `@IsNotEmpty()` on strings
- `UpdateXDto` — all fields optional, `@IsOptional()` before every validator
- `XResponseDto` — all fields the API returns, with `@ApiProperty` + examples
- No inheritance between Create/Update — keep them explicit

### Satisfying `strictPropertyInitialization` — the rule differs by DTO kind

`apps/api` is strict, so every **required** field needs either an initializer or a
definite-assignment `!`. **These are not interchangeable.**

| DTO kind | Use | Why |
|---|---|---|
| `CreateXDto`, `UpdateXDto` (request) | **`name!: string`** | `!` is compile-time only — no runtime value |
| `XResponseDto` (response) | **`id: string = ''`** | Built by the presenter, never validated |

```typescript
// ✅ request DTO — an absent field stays undefined and is still rejected
@ApiProperty({ enum: PaymentTypeEnum, enumName: 'PaymentTypeEnum' })
@IsEnum(PaymentTypeEnum)
type!: PaymentTypeEnum;

// ❌ NEVER on a request DTO
@IsEnum(PaymentTypeEnum)
type: PaymentTypeEnum = PaymentTypeEnum.RECEIPT;
```

**Why it matters:** the global `ValidationPipe` runs with `transform: true`, so
`plainToInstance` constructs the class and an initializer becomes a **real runtime value**. A
field omitted from the request body reaches the validators already populated — and passes.
Measured on an empty body: initializers reject **1 of 5** fields, `!` rejects **5 of 5**.
Initializers defeat `@IsEnum`, `@IsBoolean`, `@IsNumber`, and `@IsArray` outright; `@IsNotEmpty()`
strings survive only because `''` is itself rejected.

The concrete hazard: defaulting `CreatePaymentDto.type` would let an omitted `type` silently
become a RECEIPT — and `payment-journal.ts` branches on that value to choose the debit/credit
direction, so the cash would post to the wrong side of the ledger.

Pinned by `apps/api/src/common/__tests__/dto-validation-semantics.spec.ts`. See
`docs/superpowers/specs/2026-08-20-erp-roadmap/00-open-issues.md` (DTO validation).

```typescript
// modules/catalog/units/dto/unit.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── Create DTO ────────────────────────────────────────────────────────────────

export class CreateUnitDto {
  @ApiProperty({ example: 'Kilogram', description: 'Unit display name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'kg', description: 'Short abbreviation used on documents' })
  @IsString()
  @IsNotEmpty()
  abbreviation!: string;
}

// ── Update DTO ────────────────────────────────────────────────────────────────

export class UpdateUnitDto {
  @ApiPropertyOptional({ example: 'Kilogram (Updated)', description: 'Updated display name' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: 'kg', description: 'Updated abbreviation' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  abbreviation?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether the unit is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ── Response DTO ──────────────────────────────────────────────────────────────

export class UnitResponseDto {
  @ApiProperty({ example: '018e1234-abcd-7000-a001-000000000001' })
  id: string = '';

  @ApiProperty({ example: 'Kilogram' })
  name: string = '';

  @ApiProperty({ example: 'kg' })
  abbreviation: string = '';

  @ApiProperty({ example: true })
  isActive: boolean = true;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: string = '';

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt: string = '';
}
```

**File:** `modules/{domain}/{resource}/dto/index.ts`
```typescript
export * from './{resource}.dto';
```

---

### Step 4 — Create Events

**File:** `modules/{domain}/{resource}/events/{resource}.events.ts`

Use `resources.{resource}.key` from `@core/api-contracts` — never hardcode the resource string.
The base class `eventName()` static method builds `{key}.created`, `{key}.updated`, `{key}.deleted`.

```typescript
// modules/catalog/units/events/unit.events.ts
import { ResourceCreatedEvent, ResourceUpdatedEvent, ResourceDeletedEvent } from '@core/backend-core';
import { resources } from '@core/api-contracts';
import type { Unit } from '@core/db-prisma';

const RESOURCE_KEY = resources.units.key; // 'units'

/** Emitted when a unit of measure is created. Listen with @OnEvent(UnitCreatedEvent.NAME) */
export class UnitCreatedEvent extends ResourceCreatedEvent<Unit> {
  static readonly NAME = ResourceCreatedEvent.eventName(RESOURCE_KEY);
}

/** Emitted when a unit of measure is updated. Listen with @OnEvent(UnitUpdatedEvent.NAME) */
export class UnitUpdatedEvent extends ResourceUpdatedEvent<Unit> {
  static readonly NAME = ResourceUpdatedEvent.eventName(RESOURCE_KEY);
}

/** Emitted when a unit of measure is deleted. Listen with @OnEvent(UnitDeletedEvent.NAME) */
export class UnitDeletedEvent extends ResourceDeletedEvent<Unit> {
  static readonly NAME = ResourceDeletedEvent.eventName(RESOURCE_KEY);
}
```

> The base class `CrudService` already emits `ResourceCreatedEvent`, `ResourceUpdatedEvent`, and
> `ResourceDeletedEvent` automatically after every mutation. These typed sub-classes exist so
> that **listeners** can subscribe to a strongly-typed event with `@OnEvent(UnitCreatedEvent.NAME)`
> rather than a raw string, and receive the correct payload type.

---

### Step 5 — Create Repository

**File:** `modules/{domain}/{resource}/repositories/{resource}s.repository.ts`

```typescript
// modules/catalog/units/repositories/units.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@core/db-prisma/nest';
import { CrudRepository } from '@core/backend-core';
import type { Unit } from '@core/db-prisma';

@Injectable()
export class UnitsRepository extends CrudRepository<Unit> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma.unit); // ← pass the Prisma model delegate (lowercase model name)
  }

  // Add domain-specific queries here:
  async isNameTaken(tenantId: string, name: string, excludeId?: string): Promise<boolean> {
    const count = await this.prisma.unit.count({
      where: {
        tenantId,
        name,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    return count > 0;
  }
}
```

#### What `CrudRepository<T>` provides for free

| Method | Signature | Description |
|--------|-----------|-------------|
| `findMany` | `(tenantId, options?)` → `{ data, total }` | Paginated, tenant-scoped. Auto-merges `tenantId` into `where`. Default `orderBy: { createdAt: 'desc' }`. |
| `findById` | `(tenantId, id)` → `T \| null` | Tenant-scoped single record. |
| `findByIdOrFail` | `(tenantId, id, resourceName?)` → `T` | Throws `NotFoundException` if not found. |
| `create` | `(data)` → `T` | Caller must include `tenantId` in `data`. |
| `update` | `(id, data)` → `T` | Updates by primary key. |
| `delete` | `(id)` → `T` | Hard-deletes by primary key. |
| `exists` | `(tenantId, where)` → `boolean` | Tenant-scoped existence check. |

Rules:
- The constructor passes `prisma.{modelName}` (lowercase model name) to `super()`.
- Add `findByX()`, `countBy()`, relationship-specific queries here.
- Never throw HTTP exceptions in the repository — throw only in the service.

---

### Step 6 — Create Presenter

**File:** `modules/{domain}/{resource}/presenters/{resource}.presenter.ts`

```typescript
// modules/catalog/units/presenters/unit.presenter.ts
import { Injectable } from '@nestjs/common';
import { CrudPresenter } from '@core/backend-core';
import type { Unit } from '@core/db-prisma';
import { UnitResponseDto } from '../dto';

@Injectable()
export class UnitPresenter extends CrudPresenter<Unit, UnitResponseDto> {
  toResponse(entity: Unit): UnitResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      abbreviation: entity.abbreviation,
      isActive: entity.isActive,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
```

`CrudPresenter<TEntity, TResponse>` provides:
- `abstract toResponse(entity: TEntity): TResponse` — implement this
- `toResponseList(entities: TEntity[]): TResponse[]` — calls `toResponse` for each, provided for free

Rules:
- Date fields must be serialized to `.toISOString()`.
- If the response includes nested relations, map them here too.
- Never call the repository or service from the presenter.

---

### Step 7 — Create Service

**File:** `modules/{domain}/{resource}/services/{resource}s.service.ts`

```typescript
// modules/catalog/units/services/units.service.ts
import { Injectable, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CrudService } from '@core/backend-core';
import { resources } from '@core/api-contracts';
import type { Unit } from '@core/db-prisma';
import { UnitsRepository } from '../repositories/units.repository';
import { UnitPresenter } from '../presenters/unit.presenter';
import { CreateUnitDto, UpdateUnitDto, UnitResponseDto } from '../dto';

@Injectable()
export class UnitsService extends CrudService<Unit, UnitResponseDto, CreateUnitDto, UpdateUnitDto> {
  protected readonly resourceName = resources.units.key; // 'units'

  constructor(
    private readonly unitsRepository: UnitsRepository,
    private readonly unitPresenter: UnitPresenter,
    private readonly emitter: EventEmitter2,
  ) {
    super(unitsRepository, unitPresenter, emitter);
  }

  // ── Business rule hooks ────────────────────────────────────────────────────
  // Throw ConflictException / BadRequestException / ForbiddenException to abort.

  protected override async beforeCreate(tenantId: string, dto: CreateUnitDto): Promise<void> {
    const taken = await this.unitsRepository.isNameTaken(tenantId, dto.name);
    if (taken) {
      throw new ConflictException(`A unit named "${dto.name}" already exists`);
    }
  }

  protected override async beforeUpdate(
    tenantId: string,
    id: string,
    dto: UpdateUnitDto,
  ): Promise<void> {
    if (dto.name) {
      const taken = await this.unitsRepository.isNameTaken(tenantId, dto.name, id);
      if (taken) {
        throw new ConflictException(`A unit named "${dto.name}" already exists`);
      }
    }
  }
}
```

#### `CrudService` lifecycle hooks

The base class automatically:
1. Calls the `before*` hook — throw here to abort.
2. Runs the Prisma mutation.
3. Emits `ResourceCreatedEvent` / `ResourceUpdatedEvent` / `ResourceDeletedEvent` automatically.
4. Calls the `on*` hook — override for **additional** side effects only.

| Hook | Signature | When it runs | Typical use |
|------|-----------|-------------|-------------|
| `beforeCreate` | `(tenantId, dto)` | Before `repository.create()` | Uniqueness checks, data enrichment |
| `beforeUpdate` | `(tenantId, id, dto, existing)` | Before `repository.update()` | Uniqueness on rename, status transition guards |
| `beforeDelete` | `(tenantId, id, existing)` | Before `repository.delete()` | FK constraint checks, soft-delete guards |
| `onCreated` | `(tenantId, entity)` | After successful create | **Additional** side effects (email, cache). Base already emits `ResourceCreatedEvent`. |
| `onUpdated` | `(tenantId, entity, previous)` | After successful update | **Additional** side effects. Base already emits `ResourceUpdatedEvent`. |
| `onDeleted` | `(tenantId, entity)` | After successful delete | **Additional** side effects. Base already emits `ResourceDeletedEvent`. |

> **Important:** Do NOT re-emit `ResourceCreatedEvent` / `ResourceUpdatedEvent` / `ResourceDeletedEvent`
> inside `onCreated` / `onUpdated` / `onDeleted`. The base class already does that.
> Override these only when you need extra side effects (e.g. sending a notification, rebuilding a cache).

#### `resourceName` field

Set `resourceName` to `resources.{resource}.key` from `@core/api-contracts`.
This string is used in:
- `NotFoundException` messages (`"units with id '...' not found"`)
- The generic `ResourceCreatedEvent.eventName(resourceName)` → `'units.created'`

---

### Step 8 — Create Controller

**File:** `modules/{domain}/{resource}/controllers/{resource}s.controller.ts`

The controller uses the `createCrudController()` factory from `@core/backend-core`.
This factory returns a base class with all 5 CRUD routes, Swagger decorators, pagination, and
`ApiResponseBuilder` envelopes already wired. The concrete controller class only adds:
- Class-level decorators (`@ApiTags`, `@Controller`, `@UseGuards`, `@ApiBearerAuth`)
- Constructor that calls `super(service, 'ResourceLabel')`

```typescript
// modules/catalog/units/controllers/units.controller.ts
import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  createCrudController,
  type CrudOpenApi,
} from '@core/backend-core';
import { UnitsService } from '../services/units.service';
import { CreateUnitDto, UpdateUnitDto, UnitResponseDto } from '../dto';
import { JwtAuthGuard } from '@/modules/auth/guards';

// ── OpenAPI config ────────────────────────────────────────────────────────────
// Define summaries, descriptions, and id param docs for all 5 routes.
// The factory applies these via composite decorators — no @Get/@Post boilerplate needed.

const UNITS_CRUD_OPENAPI = {
  list: {
    operation: {
      summary: 'List units of measure',
      description: 'Returns a paginated, filterable list of units belonging to the authenticated tenant.',
    },
    responseDescription: 'Paginated list of units',
  },
  show: {
    operation: { summary: 'Get a unit by ID' },
    responseDescription: 'Unit details',
    idParam: { description: 'Unit UUID' },
  },
  create: {
    operation: {
      summary: 'Create a unit of measure',
      description: 'Creates a new unit. Name must be unique within the tenant.',
    },
    responseDescription: 'Unit created successfully',
  },
  update: {
    operation: {
      summary: 'Update a unit of measure',
      description: 'Partial update — only provided fields are changed.',
    },
    responseDescription: 'Updated unit',
    idParam: { description: 'Unit UUID' },
  },
  delete: {
    operation: {
      summary: 'Delete a unit of measure',
      description: 'Hard-deletes the unit. Will fail if the unit is referenced by active items or invoice lines.',
    },
    noContentDescription: 'Unit deleted successfully',
    idParam: { description: 'Unit UUID' },
  },
} satisfies CrudOpenApi;

// ── Base class from factory ───────────────────────────────────────────────────
// Pass the three DTO types and the OpenAPI config.
// The returned class has @Get, @Post, @Patch, @Delete methods already defined.

const UnitsCrudBase = createCrudController({
  responseDto: UnitResponseDto,
  createDto: CreateUnitDto,
  updateDto: UpdateUnitDto,
  openApi: UNITS_CRUD_OPENAPI,
});

// ── Concrete controller ───────────────────────────────────────────────────────
// Only class-level decorators and constructor are needed.

@ApiTags('Catalog / Units')   // ← "{Domain} / {Resource}" format
@Controller('units')          // ← kebab-case route
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UnitsController extends UnitsCrudBase {
  constructor(private readonly unitsService: UnitsService) {
    super(unitsService, 'Unit'); // ← resource label used in success messages
  }
}
```

#### `CrudOpenApi` shape

```typescript
type CrudOpenApi = {
  list:   { operation: CrudOperationDoc; responseDescription?: string; };
  show:   { operation: CrudOperationDoc; responseDescription?: string; idParam?: CrudIdParamDoc; };
  create: { operation: CrudOperationDoc; responseDescription?: string; };
  update: { operation: CrudOperationDoc; responseDescription?: string; idParam?: CrudIdParamDoc; };
  delete: { operation: CrudOperationDoc; noContentDescription?: string; idParam?: CrudIdParamDoc; };
};

type CrudOperationDoc = { summary: string; description?: string; };
type CrudIdParamDoc   = { name?: string; description?: string; example?: string; };
```

#### What the factory-generated base class provides

| Route | Decorator | Response |
|-------|-----------|---------|
| `GET /` | `@CrudList` | 200 `{ status, message, data: T[], meta: { pagination } }` |
| `GET /:id` | `@CrudShow` | 200 `{ status, message, data: T }` |
| `POST /` | `@CrudCreate` | 201 `{ status, message, data: T }` |
| `PATCH /:id` | `@CrudUpdate` | 200 `{ status, message, data: T }` |
| `DELETE /:id` | `@CrudDelete` | 204 (no body) |

The `@CrudList`, `@CrudShow`, etc. composite decorators from `@core/backend-core/decorators`
each apply `@ApiOperation`, `@ApiParam` (where applicable), `@ApiOkResponse` / `@ApiCreatedResponse`,
and `@ApiStandardErrors()` in a single call — so no Swagger boilerplate is needed on the concrete class.

#### HTTP-layer hooks (override in concrete controller if needed)

These are HTTP-level hooks on the generated base class. They run **around** the service call and are
distinct from the service's `before*` hooks.

| Hook | Signature | Typical use |
|------|-----------|-------------|
| `buildListOptions` | `(user, query)` → `Record<string,any>` | Customize pagination / filter / sort building |
| `beforeCreate` | `(user, dto)` → `Promise<void>` | HTTP-level guard (e.g. check permissions beyond JWT) |
| `beforeUpdate` | `(user, id, dto)` → `Promise<void>` | HTTP-level guard |
| `beforeDelete` | `(user, id)` → `Promise<void>` | HTTP-level guard |
| `afterCreate` | `(user, item)` → `Promise<void>` | HTTP-level post-create (e.g. set response header) |
| `afterUpdate` | `(user, item)` → `Promise<void>` | HTTP-level post-update |

---

### Step 9 — Create Feature Module

**File:** `modules/{domain}/{resource}/{resource}s.module.ts`

```typescript
// modules/catalog/units/units.module.ts
import { Module } from '@nestjs/common';
import { UnitsRepository } from './repositories/units.repository';
import { UnitsService } from './services/units.service';
import { UnitPresenter } from './presenters/unit.presenter';
import { UnitsController } from './controllers/units.controller';

@Module({
  controllers: [UnitsController],
  providers: [UnitsRepository, UnitsService, UnitPresenter],
  exports: [UnitsService],
})
export class UnitsModule {}
```

---

### Step 10 — Register in Domain Module

**File:** `modules/{domain}/{domain}.module.ts`

```typescript
// modules/catalog/catalog.module.ts
import { Module } from '@nestjs/common';
import { UnitsModule } from './units/units.module';

@Module({
  imports: [UnitsModule],
  exports: [UnitsModule],
})
export class CatalogModule {}
```

If the domain module is new, also register it in `app.module.ts`.

---

### Step 11 — Register EventEmitterModule (once per app)

In `app.module.ts`, ensure `EventEmitterModule` is registered globally (already done if you see it in imports):

```typescript
import { EventEmitterModule } from '@nestjs/event-emitter';

EventEmitterModule.forRoot({ wildcard: false, delimiter: '.', global: true }),
```

---

## Reference Files

The canonical reference module lives at:
```
apps/api/src/modules/catalog/units/
├── dto/
│   ├── unit.dto.ts          ← CreateUnitDto, UpdateUnitDto, UnitResponseDto
│   └── index.ts
├── events/
│   └── unit.events.ts       ← UnitCreatedEvent, UnitUpdatedEvent, UnitDeletedEvent
├── repositories/
│   └── units.repository.ts  ← extends CrudRepository<Unit>
├── presenters/
│   └── unit.presenter.ts    ← extends CrudPresenter<Unit, UnitResponseDto>
├── services/
│   └── units.service.ts     ← extends CrudService<Unit, ...>
├── controllers/
│   └── units.controller.ts  ← createCrudController() + concrete class
└── units.module.ts
```

Base classes (all from `@core/backend-core`):
- `packages/backend-core/src/base/crud-repository.ts` — `CrudRepository<T>`
- `packages/backend-core/src/base/crud-service.ts` — `CrudService<TEntity, TResponse, TCreate, TUpdate>`
- `packages/backend-core/src/base/crud-presenter.ts` — `CrudPresenter<TEntity, TResponse>`
- `packages/backend-core/src/base/crud-events.ts` — `ResourceCreatedEvent`, `ResourceUpdatedEvent`, `ResourceDeletedEvent`
- `packages/backend-core/src/base/standard-crud-controller-base.ts` — `createCrudController()`
- `packages/backend-core/src/decorators/crud-swagger.decorators.ts` — `CrudList`, `CrudShow`, `CrudCreate`, `CrudUpdate`, `CrudDelete`

---

## Domain Module Template

When creating a new domain module:

```typescript
// modules/{domain}/{domain}.module.ts
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  exports: [],
})
export class {Domain}Module {}
```

Then add to `app.module.ts`:
```typescript
import { {Domain}Module } from './modules/{domain}/{domain}.module';

@Module({ imports: [..., {Domain}Module] })
export class AppModule {}
```

---

## Response Shape Contract

The factory-generated controller uses `ApiResponseBuilder` internally — never return raw objects.

| Operation | HTTP status | Response |
|-----------|-------------|---------|
| list | 200 | `{ status:'success', message:'Unit list', data: T[], meta: { pagination } }` |
| show | 200 | `{ status:'success', message:'Unit details', data: T }` |
| create | 201 | `{ status:'success', message:'Unit created', data: T }` |
| update | 200 | `{ status:'success', message:'Unit updated', data: T }` |
| delete | 204 | (empty body) |

The `resourceLabel` passed to `super(service, 'Unit')` becomes the noun in these messages.

---

## Common Mistakes to Avoid

1. **Do NOT** call `PrismaService` directly from the service — use the repository.
2. **Do NOT** return raw Prisma entities from controllers — always use the presenter.
3. **Do NOT** write individual `@Get`, `@Post`, `@Patch`, `@Delete` methods in the controller — the factory generates them all.
4. **Do NOT** use `@InjectRepository()` (TypeORM pattern) — this project uses Prisma.
5. **Do NOT** create a new `EventEmitter2` instance — inject it; it's globally registered.
6. **Do NOT** forget `@Injectable()` on Repository, Service, and Presenter.
7. **Do NOT** omit `tenantId` from repository queries — all data is tenant-scoped.
8. **Do NOT** hardcode the resource name string — use `resources.{resource}.key` from `@core/api-contracts`.
9. **Do NOT** re-emit `ResourceCreatedEvent` / `ResourceUpdatedEvent` / `ResourceDeletedEvent` in the service's `onCreated` / `onUpdated` / `onDeleted` hooks — the base class already does this.

---

## Checklist

Before declaring a module done, verify:

- [ ] `{resource}.dto.ts` has `CreateXDto`, `UpdateXDto`, `XResponseDto` with `@ApiProperty` on all fields
- [ ] `{resource}.events.ts` exports `XCreatedEvent`, `XUpdatedEvent`, `XDeletedEvent` using `resources.X.key`
- [ ] `{resource}s.repository.ts` extends `CrudRepository<T>` and passes `prisma.{model}` to `super()`
- [ ] `{resource}.presenter.ts` extends `CrudPresenter<Entity, ResponseDto>` and implements `toResponse()`
- [ ] `{resource}s.service.ts` extends `CrudService<...>`, sets `resourceName = resources.X.key`, implements `before*` hooks for business rules only
- [ ] `{resource}s.controller.ts` uses `createCrudController()` factory, concrete class has only class decorators + constructor
- [ ] `{resource}s.module.ts` lists all providers and exports the service
- [ ] Domain `{domain}.module.ts` imports the new feature module
- [ ] `app.module.ts` imports the domain module (or it already did)
- [ ] `EventEmitterModule` is registered in `app.module.ts`
