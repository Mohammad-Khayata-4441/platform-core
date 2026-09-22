export interface ResourcePermissionSet {
  view?: string;
  create?: string;
  update?: string;
  delete?: string;
}

export type ResourcePermissionsMap = Record<string, ResourcePermissionSet>;

let permissions: ResourcePermissionsMap = {};

/**
 * Apps inject their resource→permission map here at startup. `@core/ui` never
 * hardcodes a permission catalog.
 */
export function setResourcePermissions(map: ResourcePermissionsMap): void {
  permissions = map;
}

export function getResourcePermissions(): ResourcePermissionsMap {
  return permissions;
}

/**
 * Back-compat read-only view of the injected map. Indexing it (`MAP[key]`)
 * always reflects the latest injected permissions.
 */
export const RESOURCE_PERMISSIONS = new Proxy({} as ResourcePermissionsMap, {
  get: (_target, prop: string) => permissions[prop] ?? {},
  has: (_target, prop: string) => prop in permissions,
  ownKeys: () => Reflect.ownKeys(permissions),
  getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
});
