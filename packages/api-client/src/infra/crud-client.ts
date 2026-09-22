import type {
  CrudResource,
  ApiPathByMethod,
  ApiResponse,
  ApiPath,
  ApiRequestBody,
  ImportResultDto,
  BulkResult,
  BulkUpdateItem,
} from "@core/api-contracts"
import { ApiClient } from "./client"
import { unwrapApiData } from "../utils/unwrap-api-data"

function triggerBrowserDownload(blob: Blob, filename: string): void {
  if (typeof document === "undefined") return
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export interface ICrudClient {
  key: string
  list(query?: Record<string, unknown>): Promise<unknown>
  show(id: string): Promise<unknown>
  create(body: unknown): Promise<unknown>
  update(id: string, body: unknown): Promise<unknown>
  destroy(id: string): Promise<unknown>
}

export class CrudClient<R extends CrudResource> implements ICrudClient {
  constructor(
    protected apiClient: ApiClient,
    protected resource: R,
  ) {
    this.key = resource.key
  }

  key: string;

  list(query?: Record<string, unknown>): Promise<ApiResponse<R["routes"]["list"], "get">> {
    const route = this.resource.routes.list
    // The options cast and the return-value cast are both structurally required —
    // see Phase 4 plan Task 0 "verified claim 2b" for the direct compiler probe.
    // ApiResponse<Path, Method> can't resolve while Path is still the abstract
    // R["routes"]["list"] rather than a literal, so this.apiClient.get(...)'s own
    // inferred type collapses to Promise<unknown> here — asserting the exact
    // declared return type (not `any`) keeps this from silently drifting out of
    // sync with the signature above.
    return this.apiClient.get(route, query ? ({ query } as never) : undefined) as Promise<
      ApiResponse<R["routes"]["list"], "get">
    >
  }

  show(id: string): Promise<ApiResponse<R["routes"]["show"], "get">> {
    const route = this.resource.routes.show
    return this.apiClient.get(route, { params: { id } } as never) as Promise<
      ApiResponse<R["routes"]["show"], "get">
    >
  }

  create(body: unknown): Promise<ApiResponse<NonNullable<R["routes"]["create"]>, "post">> {
    const route = this.resource.routes.create as NonNullable<R["routes"]["create"]>
    return this.apiClient.post(route, body as never) as Promise<
      ApiResponse<NonNullable<R["routes"]["create"]>, "post">
    >
  }

  update(id: string, body: unknown): Promise<ApiResponse<NonNullable<R["routes"]["update"]>, "patch">> {
    const route = this.resource.routes.update as NonNullable<R["routes"]["update"]>
    return this.apiClient.patch(route, body as never, { params: { id } } as never) as Promise<
      ApiResponse<NonNullable<R["routes"]["update"]>, "patch">
    >
  }

  destroy(id: string): Promise<ApiResponse<NonNullable<R["routes"]["delete"]>, "delete">> {
    const route = this.resource.routes.delete as NonNullable<R["routes"]["delete"]>
    return this.apiClient.delete(route, { params: { id } } as never) as Promise<
      ApiResponse<NonNullable<R["routes"]["delete"]>, "delete">
    >
  }

  /**
   * Bulk delete by ids. Hits `DELETE` on the resource's `bulkDelete` route if
   * declared, otherwise the same path as `list`. Returns `{ total, succeeded, failed, errors }`.
   */
  async bulkDelete(ids: string[]): Promise<BulkResult> {
    // Falling back to `list`'s path (reinterpreted as DELETE) is a compile-time-only
    // guarantee — it does not verify the resource's API actually implements bulk delete
    // on that route. Calling this on a resource without real bulk-delete support will
    // silently issue a DELETE to the list URL and most likely surface as a runtime
    // 404/405 rather than a type error. See Phase 4 final-review Fix 8.
    const route = (this.resource.routes.bulkDelete ??
      (this.resource.routes.list as unknown as ApiPathByMethod<"delete">)) as ApiPathByMethod<"delete">
    const response = await this.apiClient.delete(route, { body: { ids } } as never)
    return unwrapApiData<BulkResult>(response as unknown)
  }

  /**
   * Bulk partial update. Hits `PATCH` on the resource's `bulkUpdate` route if
   * declared, otherwise the same path as `list`. Each item is `{ id } & Partial<update DTO>`,
   * with the update DTO type derived from the resource's own `update` route —
   * no caller-supplied type argument needed or accepted.
   * Returns `{ total, succeeded, failed, errors }`.
   */
  async bulkUpdate(
    items: BulkUpdateItem<ApiRequestBody<NonNullable<R["routes"]["update"]>, "patch">>[],
  ): Promise<BulkResult> {
    // Same tradeoff as bulkDelete above: falling back to `list`'s path (reinterpreted
    // as PATCH) only satisfies the compiler, not the server — a resource without real
    // bulk-update support will silently PATCH the list URL and likely fail at runtime
    // (404/405) rather than at compile time. See Phase 4 final-review Fix 8.
    const route = (this.resource.routes.bulkUpdate ??
      (this.resource.routes.list as unknown as ApiPathByMethod<"patch">)) as ApiPathByMethod<"patch">
    const response = await this.apiClient.patch(route, { items } as never)
    return unwrapApiData<BulkResult>(response as unknown)
  }

  /** Downloads the Excel export (browser only). No-op server side. */
  async exportExcel(query: Record<string, unknown> = {}): Promise<void> {
    const route = this.getResourceRoute("export")
    if (!route) return
    const { blob, filename } = await this.apiClient.getBlob(route, query)
    triggerBrowserDownload(blob, filename)
  }

  /** Downloads the Excel import template (browser only). No-op server side. */
  async downloadImportTemplate(): Promise<void> {
    const route = this.getResourceRoute("importTemplate")
    if (!route) return
    const { blob, filename } = await this.apiClient.getBlob(route)
    triggerBrowserDownload(blob, filename)
  }

  /** Uploads an Excel file and returns the import result. Requires an `import` route. */
  async importExcel(file: File, dryRun = true): Promise<ImportResultDto> {
    const route = this.getResourceRoute("import")
    if (!route) {
      throw new Error(`Resource "${this.key}" does not support import`)
    }
    const formData = new FormData()
    formData.append("file", file)
    const query = dryRun ? "?dryRun=true" : "?dryRun=false"
    const response = await this.apiClient.postFormData(`${route}${query}`, formData)
    return unwrapApiData<ImportResultDto>(response)
  }

  private getResourceRoute(name: "export" | "importTemplate" | "import"): ApiPath | undefined {
    const routes = this.resource.routes as Record<string, ApiPath>
    const route = routes[name]
    return route
  }
}

export type BaseCrudItem = { id: string }

export type CrudListResponse<T extends ICrudClient> = Awaited<ReturnType<T["list"]>>

export type CrudShowResponse<T extends ICrudClient> = Awaited<ReturnType<T["show"]>>

export type CrudListItem<T extends ICrudClient> =
  CrudListResponse<T> extends { data?: ReadonlyArray<infer I> } ? I : never

export type CrudListDataItem<T extends ICrudClient> = CrudListItem<T> & BaseCrudItem

export type CrudListDataResponse<T extends ICrudClient> = CrudListResponse<T> & {
  data?: ReadonlyArray<CrudListDataItem<T>>
  meta?: unknown
}

export function listCrudData<T extends ICrudClient>(
  client: T,
  query: Record<string, unknown> = {},
): Promise<CrudListDataResponse<T>> {
  return client.list(query) as Promise<CrudListDataResponse<T>>
}

export { CrudResource }