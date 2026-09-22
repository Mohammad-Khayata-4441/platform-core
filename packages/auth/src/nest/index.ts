import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PermissionKey } from '@core/api-contracts';
import { ACCESS_TOKEN_COOKIE } from '../constants.js';
import type { AuthClaims } from '../types.js';

export type { AuthClaims } from '../types.js';

export const IS_PUBLIC_KEY = 'core:isPublic';
export const PERMISSIONS_KEY = 'core:permissions';

/** Injection token for the project-supplied role→permissions catalog. */
export const PERMISSION_CATALOG = Symbol('CORE_PERMISSION_CATALOG');
/** Injection token for the access-token verifier the app wires up (e.g. JWT). */
export const ACCESS_TOKEN_VERIFIER = Symbol('CORE_ACCESS_TOKEN_VERIFIER');

export type PermissionCatalog = Record<string, PermissionKey[]>;

export interface TokenVerifier {
  verify(token: string): Promise<AuthClaims | null> | AuthClaims | null;
}

export interface AuthenticatedRequest {
  cookies?: Record<string, string>;
  headers?: Record<string, string | string[] | undefined>;
  user?: AuthClaims;
}

/** Marks a route/controller as accessible without a valid session. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Requires the current user to hold every listed permission. */
export const RequirePermission = (...permissions: PermissionKey[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/** Parameter decorator that returns the authenticated `AuthClaims` (or a claim). */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthClaims | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) return undefined;
    return data ? user[data] : user;
  },
);

function extractToken(request: AuthenticatedRequest): string | undefined {
  const fromCookie = request.cookies?.[ACCESS_TOKEN_COOKIE];
  if (fromCookie) return fromCookie;
  const header = request.headers?.['authorization'];
  const raw = Array.isArray(header) ? header[0] : header;
  if (raw?.startsWith('Bearer ')) return raw.slice(7);
  return undefined;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(ACCESS_TOKEN_VERIFIER) private readonly verifier: TokenVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = extractToken(request);
    if (!token) throw new UnauthorizedException();

    const user = await this.verifier.verify(token);
    if (!user) throw new UnauthorizedException();

    request.user = user;
    return true;
  }
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(PERMISSION_CATALOG) private readonly catalog: PermissionCatalog,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionKey[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) return false;

    const fromRoles = new Set(
      (user.roles ?? []).flatMap((role) => this.catalog[role] ?? []),
    );
    const granted = new Set<PermissionKey>([...(user.permissions ?? []), ...fromRoles]);

    return required.every((permission) => granted.has(permission));
  }
}
