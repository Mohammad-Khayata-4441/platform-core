import type { NextFunction, Request, Response } from 'express';
import type { RequestUser } from '@core/backend-core';

/**
 * EXAMPLE-ONLY: attaches a demo user so the items slice works before auth is
 * wired. Replace with real authentication (see @core/auth) when you add it.
 */
export function demoUserMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const request = req as Request & { user?: RequestUser };
  if (!request.user) {
    request.user = { id: 'demo', tenantId: 'demo', email: 'demo@example.com' };
  }
  next();
}
