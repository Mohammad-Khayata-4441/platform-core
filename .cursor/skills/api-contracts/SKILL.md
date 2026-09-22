---
name: api-contracts
description: Use ONLY when creating or modifying resource definitions, DTOs, or shared type contracts in the packages/api-contracts package. Covers CrudResource definitions, DTO patterns, and the api types layer. Use when the user mentions adding a new API resource, creating DTOs, defining route contracts, or working with OpenAPI-generated types.
---

# API Contracts Package (`packages/api-contracts`)

This skill describes how to create and modify resource definitions and DTOs in the `@core/api-contracts` package — the **single source of truth** for all API type contracts shared between frontend and backend.

## Package Structure

```
packages/api-contracts/
├── src/
│   ├── api/
│   │   ├── types.ts          # OpenAPI-derived types: ApiPath, ApiResponse, ApiRequestBody, etc.
│   │   ├── ApiResponse.ts    # Response type helpers
│   │   ├── ApiError.ts      # Error type helpers
│   │   ├── ApiMeta.ts       # Pagination meta types
│   │   ├── ApiQueryOptions.ts # Query parameter types
│   │   └── index.ts
│   ├── resources/
│   │   ├── base/
│   │   │   ├── crud-resource.ts  # defineCrudResource() + CrudRoutes + CrudResource types
│   │   │   └── resource.ts       # defineResource() + ResourceDefinition type
│   │   ├── unit.resource.ts      # Example CRUD resource definition
│   │   ├── item-category.resource.ts
│   │   └── index.ts              # Barrel: exports all resources + `resources` map
│   ├── dto/
│   │   ├── unit.dto.ts           # Example DTO file
│   │   └── index.ts              # Barrel: exports all DTOs
│   ├── enums/
│   │   └── index.ts
│   ├── constants.ts
│   └── index.ts                  # Main barrel: re-exports dto, resources, enums, api, constants
├── package.json
└── tsconfig.json
```

---

## Adding a New Resource Definition

### Step 1: Create the resource file

File: `src/resources/<name>.resource.ts`

```ts
import { defineCrudResource } from './base/crud-resource'

export const productResource = defineCrudResource({
  key: 'products',
  routes: {
    list: '/products',
    show: '/products/{id}',
    create: '/products',
    update: '/products/{id}',
    delete: '/products/{id}',
  },
})
```

**Rules:**
- The `key` must be a plural kebab-case string matching the API URL prefix
- Routes must include all 5 CRUD routes for `CrudClient` compatibility
- Use `defineResource()` instead of `defineCrudResource()` for non-CRUD endpoints (like `authResource`)
- Route paths use `{id}` as the path parameter placeholder

### Step 2: Create the DTO file

File: `src/dto/<name>.dto.ts`

```ts
import type { Product } from "@core/db-prisma"

export interface CreateProductDto {
  name: string
  sku: string
  categoryId?: string | null
  price: number
  isActive?: boolean
}

export interface UpdateProductDto {
  name?: string
  sku?: string
  categoryId?: string | null
  price?: number
  isActive?: boolean
}

export interface ListProductsDto extends Pick<Product, 'name' | 'sku' | 'isActive'> {}
```

**Rules:**
- `CreateXxxDto` — all required fields for creation (no optional on required fields)
- `UpdateXxxDto` — all fields optional
- `ListXxxDto` — filter/pagination fields, typically using `Pick` from the Prisma model
- Import the Prisma model type from `@core/db-prisma` for reference types
- DTO files must NOT contain runtime logic — only type definitions and interfaces

### Step 3: Register in the barrel exports

**`src/resources/index.ts`** — Add the import and re-export:

```ts
import { productResource } from './product.resource'
export * from './product.resource'

export const resources = {
  // ... existing resources
  products: productResource,
} as const
```

**`src/dto/index.ts`** — Add the re-export:

```ts
export * from './product.dto'
```

---

## Resource Definition Types

### `defineCrudResource` — Standard CRUD resource

For resources with list, show, create, update, delete endpoints:

```ts
type CrudRoutes = {
  list: ApiPathByMethod<"get">      // GET /resources
  show: ApiPathByMethod<"get">      // GET /resources/{id}
  create: ApiPathByMethod<"post">   // POST /resources
  update: ApiPathByMethod<"patch">  // PATCH /resources/{id}
  delete: ApiPathByMethod<"delete"> // DELETE /resources/{id}
}

type CrudResource<TKey, TRoutes extends CrudRoutes> = ResourceDefinition<TKey, TRoutes>
```

Additional custom routes can be added beyond the standard CRUD five:

```ts
export const itemResource = defineCrudResource({
  key: 'items',
  routes: {
    list: '/items',
    show: '/items/{id}',
    create: '/items',
    update: '/items/{id}',
    delete: '/items/{id}',
    // Custom routes beyond CRUD:
    activate: '/items/{id}/activate',     // custom route
    deactivate: '/items/{id}/deactivate', // custom route
  },
})
```

### `defineResource` — Non-CRUD resource (e.g., auth)

For resources that don't follow CRUD patterns:

```ts
export const authResource = defineResource({
  key: 'auth',
  routes: {
    login: '/auth/login',
    logout: '/auth/logout',
    me: '/auth/me',
  },
})
```

---

## API Type System

### Route-level type inference

The `api/types.ts` file provides type-level utilities that infer request/response types from the OpenAPI schema:

```ts
import type { ApiPath, ApiResponse, ApiRequestBody, ApiQueryParams, ApiPathParams } from "@core/api-contracts"

// Example: Get the response type for GET /units
type UnitsListResponse = ApiResponse<"/units", "get">

// Example: Get the request body for POST /units
type CreateUnitBody = ApiRequestBody<"/units", "post">

// Example: Get query params for a list endpoint
type UnitsQueryParams = ApiQueryParams<"/units", "get">

// Example: Get path params for a detail endpoint
type UnitPathParams = ApiPathParams<"/units/{id}", "get">
```

### How types flow through the stack

```
OpenAPI Schema (Swagger JSON)
    ↓ openapi-typescript
packages/api-contracts/src/types/  (auto-generated `paths`, `components`, `operations`)
    ↓ type exports
packages/api-contracts/src/api/types.ts  (ApiPath, ApiResponse, etc.)
    ↓ resource definitions
packages/api-contracts/src/resources/*.resource.ts  (defineCrudResource)
    ↓ client inference
packages/api-client/src/infra/crud-client.ts  (CrudClient<R> infers all types from resource)
    ↓ dashboard
apps/dashboard/modules/*  (fully typed from client generic)
```

---

## Important Rules

1. **Never manually edit `src/types/`** — it's auto-generated from the OpenAPI schema by `openapi-typescript`
2. **Resource keys must be unique** — they're used as React Query cache keys
3. **Route paths must match the actual API endpoints exactly** — they're used for type-safe fetch calls
4. **DTOs should use `interface` not `type`** — for better error messages and declaration merging
5. **Always add new resources to both barrel exports** (`src/resources/index.ts` AND `src/dto/index.ts`)
6. **`CrudResource` type is the minimum requirement** for `CrudClient` in `api-client` — resources missing any of the 5 CRUD routes must use `defineResource` instead and get a custom client
7. **The `resources` map in `src/resources/index.ts`** is a convenience object that maps resource keys to definitions — add new entries there for centralized access