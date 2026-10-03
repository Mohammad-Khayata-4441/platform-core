import type { INestApplication } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

const DEFAULT_LOGIN_LIMIT = 10;
const DEFAULT_LOGIN_WINDOW_MS = 60_000;

export interface ConfigureHttpOptions {
  /** Attempts allowed per client in the window, counted separately on each limited route. */
  loginRateLimit?: number;
  /** Window length in milliseconds. */
  loginRateWindowMs?: number;
}

/** Shared cookie, Helmet, and public sign-in limits for `main.ts` and the e2e app. */
export function configureHttp(app: INestApplication, options: ConfigureHttpOptions = {}): void {
  app.use(helmet());
  app.use(cookieParser());
  const limit = options.loginRateLimit ?? DEFAULT_LOGIN_LIMIT;
  const windowMs = options.loginRateWindowMs ?? DEFAULT_LOGIN_WINDOW_MS;
  app.use('/auth/login', attemptLimiter(limit, windowMs, 'Too many sign-in attempts'));
  app.use('/auth/otp/request', attemptLimiter(limit, windowMs, 'Too many attempts'));
  app.use('/auth/otp/verify', attemptLimiter(limit, windowMs, 'Too many attempts'));
}

function attemptLimiter(limit: number, windowMs: number, message: string) {
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
        message,
        data: null,
        error: { code: 'TOO_MANY_REQUESTS', message },
      });
      return;
    }

    recent.push(now);
    hits.set(key, recent);
    next();
  };
}
