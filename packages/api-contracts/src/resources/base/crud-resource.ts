import { ApiPath, ApiPathByMethod } from "../../api"
import { ResourceDefinition } from "./resource"

/**
 * Standard CRUD route names.
 * Resources using CrudClient must provide routes with these keys.
 */
export type CrudRoutes = {
  list: ApiPathByMethod<"get">
  show: ApiPathByMethod<"get">
  create?: ApiPathByMethod<"post">
  update?: ApiPathByMethod<"patch">
  delete?: ApiPathByMethod<"delete">
  /** Bulk delete route. Defaults to `list`'s path (`DELETE` on the same URL as the list `GET`) when omitted. */
  bulkDelete?: ApiPathByMethod<"delete">
  /** Bulk update route. Defaults to `list`'s path (`PATCH` on the same URL as the list `GET`) when omitted. */
  bulkUpdate?: ApiPathByMethod<"patch">
}

/**
 * A resource that satisfies CRUD requirements.
 * May have extra routes beyond the standard five.
 */
export type CrudResource<
  TKey extends string = string,
  TRoutes extends CrudRoutes & Record<string, ApiPath> = CrudRoutes & Record<string, ApiPath>,
> = ResourceDefinition<TKey, TRoutes>


export function defineCrudResource<T extends string, R extends CrudRoutes & Record<string, ApiPath>>(
  def: CrudResource<T, R>,
): CrudResource<T, R> {
  return def
}