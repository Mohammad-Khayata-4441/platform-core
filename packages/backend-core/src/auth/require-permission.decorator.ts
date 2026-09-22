import { SetMetadata } from '@nestjs/common';
import type { PermissionKey } from '@core/api-contracts';

/**
 * Metadata key read by PermissionsGuard in apps/api.
 * Kept in backend-core so the CRUD controller factory and hand-written
 * controllers share one source of truth.
 */
export const PERMISSION_METADATA_KEY = 'core:permissions';

/**
 * Declares the permission(s) required to invoke a route.
 * All listed permissions are required (logical AND).
 */
export const RequirePermission = (
  ...permissions: PermissionKey[]
): MethodDecorator & ClassDecorator => SetMetadata(PERMISSION_METADATA_KEY, permissions);
