import type { AuthAudience } from './constants.js';
import type { PermissionKey } from '@core/api-contracts';

/** Shape of the JWT payload signed into the access-token cookie. */
export interface AuthClaims {
  sub: string;
  audience: AuthAudience;
  roles: string[];
  permissions: PermissionKey[];
  /** Project-specific claims (e.g. tenantId, storeId). */
  extra?: Record<string, unknown>;
  /** Standard JWT expiry claim, seconds since epoch. */
  exp?: number;
  iat?: number;
}
