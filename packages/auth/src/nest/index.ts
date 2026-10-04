export {
  ACCESS_TOKEN_VERIFIER,
  CurrentUser,
  IS_PUBLIC_KEY,
  JwtAuthGuard,
  PERMISSION_CATALOG,
  PERMISSIONS_KEY,
  PermissionGuard,
  Public,
  RequirePermission,
} from './guards.js';
export type { AuthenticatedRequest, AuthClaims, PermissionCatalog, TokenVerifier } from './guards.js';

export { AuthModule } from './auth.module.js';
export type { AuthModuleAsyncOptions, AuthModuleOptions } from './auth.module.js';
export { AUTH_OPTIONS } from './auth.tokens.js';
export type { GoogleIdentity, GoogleSignIn } from '../session/google.js';
export type { OtpSignIn } from '../session/otp.js';
export { SessionError, SessionService } from '../session/session.js';
export type {
  PermissionRecord,
  PublicRole,
  PublicUser,
  RolePermissionRecord,
  RoleRecord,
  SessionDelegate,
  SessionRefreshRecord,
  SessionUserRecord,
  UserRoleRecord,
} from '../session/types.js';
