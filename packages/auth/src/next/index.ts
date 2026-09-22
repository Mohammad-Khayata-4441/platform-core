// Server-only helpers (read request cookies via `next/headers`). Consumed by
// server components/layouts, e.g. `await isAuthenticated()`.
// @ts-expect-error - `next` ships no exports map, so its subpaths aren't statically
// resolvable under NodeNext from this package; resolves fine at runtime in consuming apps.
import { cookies } from 'next/headers';
import { ACCESS_TOKEN_COOKIE } from '../constants.js';
import type { AuthClaims } from '../types.js';

export async function getAccessToken(): Promise<string | undefined> {
  const ck = await cookies();
  return ck.get(ACCESS_TOKEN_COOKIE)?.value;
}

/**
 * Decodes the access token's JWT payload without verifying its signature —
 * cheap, read-only introspection for SSR gating. The API remains the sole
 * authority on whether the token is actually valid.
 */
export async function getSession(): Promise<AuthClaims | null> {
  const token = await getAccessToken();
  if (!token) return null;
  const payloadSegment = token.split('.')[1];
  if (!payloadSegment) return null;
  try {
    const json = Buffer.from(payloadSegment, 'base64url').toString('utf8');
    return JSON.parse(json) as AuthClaims;
  } catch {
    return null;
  }
}

/** Presence check — a valid/refreshable session, not a decoded/verified one. */
export async function isAuthenticated(): Promise<boolean> {
  return !!(await getAccessToken());
}
