import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { AuthAudience } from '../constants.js';
import type { AuthClaims } from '../types.js';

const UNITS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/** Parse a duration such as `15m`, `24h`, or `7d` into milliseconds. */
export function durationToMs(value: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(value.trim());
  const amount = match?.[1];
  const unit = match?.[2];
  const factor = unit ? UNITS[unit] : undefined;
  if (!amount || factor === undefined) {
    throw new Error(`Invalid duration "${value}". Use a number followed by s, m, h, or d.`);
  }
  return Number(amount) * factor;
}

function encode(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function sign(payload: AuthClaims, secret: string): string {
  const data = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}`;
  const signature = createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

/** HMAC access token. `roles` and `permissions` are the caller's current grants. */
export function signAccessToken(
  userId: string,
  secret: string,
  ttlMs: number,
  audience: AuthAudience = 'public',
  claims: { roles: readonly string[]; permissions: readonly string[] } = { roles: [], permissions: [] },
): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  return sign(
    {
      sub: userId,
      audience,
      roles: [...claims.roles],
      permissions: [...claims.permissions],
      iat: issuedAt,
      exp: issuedAt + Math.floor(ttlMs / 1000),
    },
    secret,
  );
}

/** Verify an access token. Returns null when the signature, shape, or expiry is wrong. */
export function verifyAccessToken(token: string, secret: string): AuthClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  if (!header || !body || !signature) return null;

  const expected = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  const actualBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length || !timingSafeEqual(actualBuf, expectedBuf)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Partial<AuthClaims>;
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) return null;
    if (payload.audience !== 'public' && payload.audience !== 'merchant' && payload.audience !== 'admin') {
      return null;
    }
    if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) return null;
    return {
      sub: payload.sub,
      audience: payload.audience,
      roles: Array.isArray(payload.roles) ? payload.roles.filter((role) => typeof role === 'string') : [],
      permissions: Array.isArray(payload.permissions)
        ? payload.permissions.filter((permission) => typeof permission === 'string')
        : [],
      iat: typeof payload.iat === 'number' ? payload.iat : undefined,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

export function newRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

/** HMAC so a leaked database row is not a usable cookie, and rotating the refresh secret ends old sessions. */
export function hashRefreshToken(token: string, secret: string): string {
  return createHmac('sha256', secret).update(token).digest('hex');
}
