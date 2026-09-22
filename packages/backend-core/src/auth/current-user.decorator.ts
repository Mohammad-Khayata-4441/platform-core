import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestUser } from './request-user.js';

/**
 * Extracts the authenticated user from the request object.
 * Populated by JwtAuthGuard after JWT validation.
 *
 * Usage:
 *   @Get()
 *   list(@CurrentUser() user: RequestUser) { ... }
 *
 *   @Get()
 *   list(@CurrentUser('tenantId') tenantId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext): RequestUser | string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as RequestUser;
    return data ? user[data] : user;
  },
);
