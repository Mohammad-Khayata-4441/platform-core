import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { CORRELATION_ID } from '../constants/headers';
import { RequestContext } from './request-context';

/** Accept caller-supplied ids only if they are short and header-safe. */
const SAFE_ID = /^[A-Za-z0-9._-]{1,128}$/;

/**
 * Plain Express middleware (registered with app.use in main.ts, so it wraps
 * every route with no Nest route-pattern matching). Everything downstream of
 * next() — guards, interceptors, services, Prisma calls — runs inside the context.
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.header(CORRELATION_ID);
    const correlationId = incoming && SAFE_ID.test(incoming) ? incoming : randomUUID();
    res.setHeader(CORRELATION_ID, correlationId);
    RequestContext.run({ correlationId, source: 'HTTP', ipAddress: req.ip }, () => next());
}
