---
name: api-client
description: Use ONLY when creating or modifying API clients in the packages/api-client package. Covers CrudClient, ApiClient, custom client patterns, the createApi factory, and how new resource clients are registered. Use when the user mentions adding a new API client, creating a CrudClient subclass, fixing API fetch calls, or working with the api-client infrastructure layer.
---

# API Client Package (`packages/api-client`)

This skill describes how to create API clients in `@core/api-client` — the **type-safe HTTP client layer** that consumes resource definitions from `api-contracts` and provides strongly-typed methods for the dashboard.

## Package Structure

```
packages/api-client/
├── src/
│   ├── api.ts                    # createApi() factory + api singleton
│   ├── infra/
│   │   ├── client.ts             # ApiClient — base HTTP client (get, post, put, patch, delete)
│   │   ├── crud-client.ts        # CrudClient<R> — generic CRUD methods
│   │   └── index.ts              # Barrel: exports ApiClient, CrudClient, structural types
│   ├── clients/
│   │   ├── auth.client.ts        # Custom client (non-CRUD)
│   │   ├── units.client.ts       # CrudClient subclass
│   │   ├── categories.client.ts  # CrudClient subclass
│   │   └── index.ts              # Barrel: exports all clients
│   └── index.ts                  # Main barrel: infra + clients + factory
├── package.json
└── tsconfig.json
```

---

## Adding a New CRUD Client

### Step 1: Ensure the resource definition exists in `api-contracts`

The client depends on a `CrudResource` definition. See the `api-contracts` skill for how to create one.

### Step 2: Create the client file

File: `src/clients/<name>.client.ts`

```ts
import { productResource } from "@core/api-contracts"
import { ApiClient, CrudClient } from "../infra"

export class ProductsClient extends CrudClient<typeof productResource> {
  constructor(apiClient: ApiClient) {
    super(apiClient, productResource)
  }
}
```

**That's it.** All method types (`list`, `show`, `create`, `update`, `destroy`) and their request/response types are **automatically inferred** from the resource definition via the `CrudClient<R>` generic.

### Step 3: Register in the clients barrel

File: `src/clients/index.ts`

```ts
export * from "./products.client"
```

### Step 4: Register in the API factory

File: `src/api.ts`

```ts
import { productResource } from "@core/api-contracts"
import { ProductsClient } from "./clients/products.client"
// ... existing imports

export function createApi(options?: ApiClientOptions, baseUrl = 'http://localhost:4040') {
    const client = new ApiClient(baseUrl, options)
    return {
        client,
        auth: new AuthClient(client),
        units: new UnitsClient(client),
        categories: new CategoriesClient(client, itemCategoryResource),
        products: new ProductsClient(client),  // ← Add here
    }
}

export type Api = ReturnType<typeof createApi>
```

After this, `api.products` is immediately available throughout the dashboard via `useApi()`.

---

## Client Hierarchy

### `ApiClient` — Base HTTP Client

The foundational client that all others build on. Handles:

- **Authentication headers** — Passed via `ApiClientOptions.headers`
- **HTTP methods** — `get()`, `post()`, `put()`, `patch()`, `delete()`, `request()`, `postFormData()`
- **Error handling** — Throws `ApiError` with status, statusText, endpoint, method, and optional `validationErrors`
- **Type safety** — All methods are generic over `ApiPath` and `HttpMethod`, providing compile-time route validation

```ts
// Direct usage (rare, prefer CrudClient or a custom client)
const api = new ApiClient('http://localhost:4040', { headers: { Authorization: 'Bearer ...' } })
const units = await api.get('/units', { query: { page: 1, limit: 20 } })
```

### `CrudClient<R extends CrudResource>` — Generic CRUD Client

Provides typed CRUD methods by reading route paths and types from the resource definition:

| Method | Signature | Description |
|---|---|---|
| `list(query?)` | `Promise<ApiResponse<R["routes"]["list"], "get">>` | List resources with optional query params |
| `show(id)` | `Promise<ApiResponse<R["routes"]["show"], "get">>` | Get a single resource by ID |
| `create(body)` | `Promise<ApiResponse<R["routes"]["create"], "post">>` | Create a new resource |
| `update(id, body)` | `Promise<ApiResponse<R["routes"]["update"], "patch">>` | Update a resource |
| `destroy(id)` | `Promise<ApiResponse<R["routes"]["delete"], "delete">>` | Delete a resource |
| `key` | `string` | The resource's key (for cache keys, query keys) |

### Structural Sub-types

These types allow the dashboard's resource layer to accept only the capabilities it needs:

```ts
/** Client that can list resources (used by query hooks) */
type CrudListClient<R extends CrudResource = CrudResource> = Pick<CrudClient<R>, "list">

/** Client that can list and delete resources (used by resource page components) */
type CrudCollectionClient<R extends CrudResource = CrudResource> = Pick<CrudClient<R>, "list" | "destroy" | "key">
```

The dashboard uses `CrudCollectionClient` as its generic constraint — meaning any `CrudClient` subclass automatically satisfies the requirement.

---

## Creating a Custom (Non-CRUD) Client

For resources that don't follow the CRUD pattern (e.g., `AuthClient`):

```ts
import { authResource, type ApiRequestBody } from "@core/api-contracts"
import { ApiClient } from "../infra/client"

export class AuthClient {
    constructor(private readonly apiClient: ApiClient) {}

    login = async (payload: ApiRequestBody<typeof authResource.routes.login, 'post'>) => {
        return this.apiClient.post(authResource.routes.login, payload)
    }

    me = async () => {
        return this.apiClient.get(authResource.routes.me)
    }
}
```

**Key differences from CrudClient:**
- Extends nothing — directly uses `ApiClient` methods
- Methods are arrow functions (auto-bound)
- Types are inferred from the resource definition via `ApiRequestBody` / `ApiResponse`

---

## Dashboard Integration

### `useApi()` — The primary way to get the API instance

```ts
// In any component or hook:
import { useApi } from "@/shared/useApi"

function MyComponent() {
    const api = useApi()
    const units = await api.units.list({ page: 1, limit: 20 })
}
```

Or the server-side equivalent:

```ts
import { getAuthApi } from "@/shared/api"

// In server components / server actions:
const api = await getAuthApi()
```

### `createApi()` — The factory function

```ts
export function createApi(options?: ApiClientOptions, baseUrl = 'http://localhost:4040') {
    const client = new ApiClient(baseUrl, options)
    return {
        client,       // Raw ApiClient instance
        auth: new AuthClient(client),
        units: new UnitsClient(client),
        categories: new CategoriesClient(client, itemCategoryResource),
        // ... add new clients here
    }
}

export type Api = ReturnType<typeof createApi>
```

### Type inference flow

```
CrudResource definition (api-contracts)
    ↓ typeof
CrudClient<typeof resource>  (generic parameter)
    ↓ method inference
UnitsClient                                                  (concrete subclass)
    ↓ useApi().units
CrudCollectionClient constraint                              (dashboard context)
    ↓ resource context
ResourceProvider<UnitsClient>                                (provider generic)
    ↓ useResourceContext<UnitsClient>()
ResourceContext<UnitsClient>                                 (fully typed context)
```

This chain ensures **end-to-end type safety** from API route definition to dashboard component props.

---

## Error Handling

### `ApiError` — Thrown on non-2xx responses

```ts
class ApiError extends Error {
    readonly status: number
    readonly statusText: string
    readonly endpoint: string
    readonly method: string
    readonly payload?: ErrorPayload

    get validationErrors(): Record<string, string[]> | undefined
}
```

In the dashboard, `useFormMutation` automatically extracts `validationErrors` and maps them to form fields:

```ts
// In use-form-mutation.ts:
onError: (err) => {
    if (err instanceof ApiError && err.validationErrors) {
        Object.entries(err.validationErrors).forEach(([field, msgs]) => {
            form.setError(field, { message: msgs[0] })
        })
    }
}
```

---

## Important Rules

1. **Always extend `CrudClient<typeof resource>`** for standard CRUD — never manually type `list/show/create/update/destroy`
2. **Pass the resource definition as the second constructor argument** — `super(apiClient, resource)` — this is required for type inference
3. **Register new clients in all 3 places**: `src/clients/index.ts`, `src/api.ts` (the factory), and the clients export
4. **The `Api` type is inferred from `createApi()`** — never define it manually; it stays in sync automatically
5. **Custom clients should still use the `authResource` or similar resource definitions** for type-safe route paths — never hardcode URL strings
6. **`ApiError.validationErrors`** maps field names to arrays of error messages — use this in form error handling
7. **For file uploads**, use `ApiClient.postFormData()` which handles `multipart/form-data` automatically
8. **The `key` property on `CrudClient`** is used as the default React Query key prefix — it comes from the resource definition's `key` field