'use client';

import type { PermissionKey } from '@core/api-contracts';

let current: readonly PermissionKey[] = [];

/** Apps set the current user's permissions after auth. */
export function setPermissions(permissions: readonly PermissionKey[]): void {
  current = permissions;
}

/**
 * Cosmetic UI gating only — the API is the enforcement point. When no
 * permissions have been injected, gating is permissive (dev-friendly).
 */
export function usePermissions() {
  const permissions = current;
  const permissive = permissions.length === 0;
  const can = (permission: PermissionKey) => permissive || permissions.includes(permission);
  const canAny = (...required: PermissionKey[]) => permissive || required.some(can);

  return { permissions, can, canAny };
}
