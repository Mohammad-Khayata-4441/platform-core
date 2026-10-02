import type { INestApplication } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

const DEFAULT_LOGIN_LIMIT = 10;
const DEFAULT_LOGIN_WINDOW_MS = 60_000;

export interface ConfigureHttpOptions {
  /** Password sign-in attempts allowed per client in the window. */
  loginRateLimit?: number;
  /** Window length in milliseconds. */
  loginRateWindowMs?: number;
}

/** Shared cookie, Helmet, and password sign-in limit for `main.ts` and the e2e app. */
export function configureHttp(app: INestApplication, options: ConfigureHttpOptions = {}): void {
  app.use(helmet());
  app.use(cookieParser());
  app.use(
    '/auth/login',
    loginRateLimiter(
      options.loginRateLimit ?? DEFAULT_LOGIN_LIMIT,
      options.loginRateWindowMs ?? DEFAULT_LOGIN_WINDOW_MS,
    ),
  );
}

function loginRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>();

  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method !== 'POST') {
      next();
      return;
    }

    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'local';
    const recent = (hits.get(key) ?? []).filter((at) => now - at < windowMs);
    if (recent.length >= limit) {
      res.status(429).json({
        status: 'error',
        message: 'Too many sign-in attempts',
        data: null,
        error: { code: 'TOO_MANY_REQUESTS', message: 'Too many sign-in attempts' },
      });
      return;
    }

    recent.push(now);
    hits.set(key, recent);
    next();
  };
}
