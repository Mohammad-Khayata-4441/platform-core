import { ApiPath } from "../../api"





export interface ResourceDefinition<
  TKey extends string = string,
  TRoutes extends Record<string, ApiPath> = Record<string, ApiPath>,

> {
  key: TKey
  routes: TRoutes
}

export function defineResource<
  TKey extends string,
  TRoutes extends Record<string, ApiPath>,
>(resource: ResourceDefinition<TKey, TRoutes>): ResourceDefinition<TKey, TRoutes> {
  return resource
}

