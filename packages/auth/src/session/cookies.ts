import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '../constants.js';
import type { IssuedSession } from './types.js';

export interface SessionCookieResponse {
  cookie(
    name: string,
    value: string,
    options: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: 'lax';
      path: string;
      maxAge: number;
    },
  ): void;
  clearCookie(name: string, options: { path: string }): void;
}

function options(maxAge: number, secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

/** Sets both cookies. The refresh cookie is `Path=/` so Next middleware can see it. */
export function applySessionCookies(res: SessionCookieResponse, session: IssuedSession, secure: boolean): void {
  res.cookie(ACCESS_TOKEN_COOKIE, session.accessToken, options(session.accessMaxAgeMs, secure));
  res.cookie(REFRESH_TOKEN_COOKIE, session.refreshToken, options(session.refreshMaxAgeMs, secure));
}

export function clearSessionCookies(res: SessionCookieResponse): void {
  res.clearCookie(ACCESS_TOKEN_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' });
}
