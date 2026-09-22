// @ts-expect-error - `next` ships no exports map, so its subpaths aren't statically
// resolvable under NodeNext from this package; resolves fine at runtime in consuming apps.
import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '../constants.js';

type NextMiddleware = (request: NextRequest) => NextResponse | Promise<NextResponse>;

/**
 * Returns true when the access token is absent or its JWT `exp` claim is in
 * the past. A malformed/undecodable token is treated as expired so a refresh
 * is attempted rather than bouncing the user to login.
 */
export function isAccessTokenExpired(token: string | undefined): boolean {
  if (!token) return true;
  const payloadSegment = token.split('.')[1];
  if (!payloadSegment) return true;
  try {
    const b64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    return typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

function parseCookieNameValues(header: string): [string, string][] {
  return header
    .split(';')
    .map((pair) => {
      const idx = pair.indexOf('=');
      return idx === -1
        ? null
        : ([pair.slice(0, idx).trim(), pair.slice(idx + 1).trim()] as [string, string]);
    })
    .filter((entry): entry is [string, string] => entry !== null && entry[0].length > 0);
}

/**
 * Merges the cookies from a refresh response's `Set-Cookie` headers into an
 * existing `Cookie` header, newest value winning per name. Extracted for testability.
 */
export function mergeCookieHeader(cookieHeader: string, setCookieHeaders: string[]): string {
  const entries = new Map(parseCookieNameValues(cookieHeader));
  for (const setCookie of setCookieHeaders) {
    const idx = setCookie.indexOf('=');
    if (idx === -1) continue;
    const name = setCookie.slice(0, idx).trim();
    if (!name) continue;
    const value = (setCookie.slice(idx + 1).split(';')[0] ?? '').trim();
    entries.set(name, value);
  }
  return [...entries.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
}

function getSetCookieHeaders(headers: Headers): string[] {
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }
  const values: string[] = [];
  headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') values.push(value);
  });
  return values;
}

/**
 * Silent server-side refresh, composable with an app's existing middleware
 * (e.g. next-intl locale routing). When the access token is missing OR expired
 * and a refresh-token cookie is present, calls the refresh endpoint
 * server-to-server, forwards its `Set-Cookie`s onto the outgoing response and
 * rewrites the downstream request's Cookie header so the current render sees
 * the fresh access token instead of bouncing to `/login`.
 */
export function createAuthMiddleware(refreshApiUrl: string, next?: NextMiddleware) {
  return async function middleware(request: NextRequest) {
    const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
    const hasRefresh = request.cookies.has(REFRESH_TOKEN_COOKIE);

    const needsRefresh = hasRefresh && isAccessTokenExpired(accessToken);

    const response = next ? await next(request) : NextResponse.next();

    if (!needsRefresh) return response;

    const cookieHeader = request.headers.get('cookie') ?? '';
    let refreshRes: Response;
    try {
      refreshRes = await fetch(refreshApiUrl, {
        method: 'POST',
        headers: { Cookie: cookieHeader },
      });
    } catch {
      // Network hiccup — fall through; the layout will handle the 401.
      return response;
    }
    if (!refreshRes.ok) return response;

    const refreshedCookies = getSetCookieHeaders(refreshRes.headers);
    if (refreshedCookies.length === 0) return response;

    for (const setCookie of refreshedCookies) {
      response.headers.append('set-cookie', setCookie);
    }

    if (response.status === 200) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('cookie', mergeCookieHeader(cookieHeader, refreshedCookies));
      const rewritten = NextResponse.next({ request: { headers: requestHeaders } });
      response.headers.forEach((value: string, key: string) => {
        if (key.toLowerCase() !== 'set-cookie') {
          rewritten.headers.set(key, value);
        }
      });
      for (const setCookie of getSetCookieHeaders(response.headers)) {
        rewritten.headers.append('set-cookie', setCookie);
      }
      return rewritten;
    }

    return response;
  };
}
