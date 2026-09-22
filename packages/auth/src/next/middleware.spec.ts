import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  NextResponse: null as unknown as { next: (opts?: { request?: { headers?: Headers } }) => any },
}));

vi.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    headers: Headers;
    requestHeaders?: Headers;

    constructor(status: number, opts?: { request?: { headers?: Headers } }) {
      this.status = status;
      this.headers = new Headers();
      this.requestHeaders = opts?.request?.headers;
    }

    static next(opts?: { request?: { headers?: Headers } }) {
      return new MockNextResponse(200, opts);
    }
  }
  mocks.NextResponse = MockNextResponse as any;
  return { NextResponse: MockNextResponse };
});

import { createAuthMiddleware, isAccessTokenExpired, mergeCookieHeader } from './middleware';

const ACCESS = 'access_token';
const REFRESH = 'refresh_token';

const base64url = (value: string) => Buffer.from(value, 'utf8').toString('base64url');
const makeToken = (payload: Record<string, unknown>) =>
  `${base64url('{}')}.${base64url(JSON.stringify(payload))}.sig`;

function makeRequest(cookies: Record<string, string>) {
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
  return {
    cookies: {
      get: (name: string) => (name in cookies ? { value: cookies[name] } : undefined),
      has: (name: string) => name in cookies,
    },
    headers: new Headers({ cookie: cookieHeader }),
  } as any;
}

function refreshResponse(setCookies: string[]) {
  return {
    ok: true,
    headers: new Headers(setCookies.map((value) => ['set-cookie', value] as [string, string])),
  } as unknown as Response;
}

describe('isAccessTokenExpired', () => {
  it('treats a missing token as expired', () => {
    expect(isAccessTokenExpired(undefined)).toBe(true);
  });

  it('returns true for a token whose exp is in the past', () => {
    const token = makeToken({ exp: Math.floor(Date.now() / 1000) - 60 });
    expect(isAccessTokenExpired(token)).toBe(true);
  });

  it('returns false for a token whose exp is in the future', () => {
    const token = makeToken({ exp: Math.floor(Date.now() / 1000) + 3600 });
    expect(isAccessTokenExpired(token)).toBe(false);
  });

  it('returns true for malformed / missing-payload tokens', () => {
    expect(isAccessTokenExpired('not-a-jwt')).toBe(true);
    expect(isAccessTokenExpired(`${base64url('{}')}`)).toBe(true);
  });

  it('returns true when the payload has no exp claim', () => {
    expect(isAccessTokenExpired(makeToken({ sub: '1' }))).toBe(true);
  });
});

describe('mergeCookieHeader', () => {
  it('merges refresh Set-Cookie values into the existing header', () => {
    const merged = mergeCookieHeader('access_token=old; refresh_token=old', [
      'access_token=new-access; Path=/; HttpOnly',
      'refresh_token=new-refresh; Path=/; HttpOnly',
    ]);
    expect(merged).toContain('access_token=new-access');
    expect(merged).toContain('refresh_token=new-refresh');
  });

  it('keeps unrelated cookies untouched', () => {
    const merged = mergeCookieHeader('theme=dark; access_token=old', ['access_token=new; Path=/']);
    expect(merged).toContain('theme=dark');
    expect(merged).toContain('access_token=new');
  });

  it('handles an empty original header', () => {
    expect(mergeCookieHeader('', ['access_token=new; Path=/'])).toBe('access_token=new');
  });
});

describe('createAuthMiddleware', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('does not refresh when the access token is still valid', async () => {
    const valid = makeToken({ exp: Math.floor(Date.now() / 1000) + 3600 });
    const middleware = createAuthMiddleware('http://api/merchant/auth/refresh');
    await middleware(makeRequest({ [ACCESS]: valid, [REFRESH]: 'rt' }));
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not refresh when no refresh cookie is present', async () => {
    const middleware = createAuthMiddleware('http://api/merchant/auth/refresh');
    await middleware(makeRequest({ [ACCESS]: makeToken({ exp: 0 }) }));
    expect(fetch).not.toHaveBeenCalled();
  });

  it('refreshes when the access token is expired and forwards cookies to the browser and the render', async () => {
    const expired = makeToken({ exp: Math.floor(Date.now() / 1000) - 60 });
    const refreshFetch = vi.fn().mockResolvedValue(
      refreshResponse([
        'access_token=NEWACCESS; Path=/; HttpOnly',
        'refresh_token=NEWREFRESH; Path=/; HttpOnly',
      ]),
    );
    vi.stubGlobal('fetch', refreshFetch);

    const middleware = createAuthMiddleware('http://api/merchant/auth/refresh');
    const res = await middleware(
      makeRequest({ [ACCESS]: expired, [REFRESH]: 'rt', theme: 'dark' }),
    );

    expect(refreshFetch).toHaveBeenCalledWith('http://api/merchant/auth/refresh', {
      method: 'POST',
      headers: {
        Cookie: `access_token=${expired}; refresh_token=rt; theme=dark`,
      },
    });

    const setCookies = res.headers.getSetCookie?.() ?? [];
    expect(setCookies.some((c: string) => c.startsWith('access_token=NEWACCESS'))).toBe(true);
    expect(setCookies.some((c: string) => c.startsWith('refresh_token=NEWREFRESH'))).toBe(true);

    const downstreamCookie = res.requestHeaders.get('cookie');
    expect(downstreamCookie).toContain('access_token=NEWACCESS');
    expect(downstreamCookie).toContain('refresh_token=NEWREFRESH');
    expect(downstreamCookie).toContain('theme=dark');
  });

  it('does not forward cookies when the refresh endpoint rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, headers: new Headers() }));

    const middleware = createAuthMiddleware('http://api/merchant/auth/refresh');
    const res = await middleware(makeRequest({ [ACCESS]: makeToken({ exp: 0 }), [REFRESH]: 'rt' }));

    expect(res.headers.getSetCookie?.() ?? []).toHaveLength(0);
    expect(res.requestHeaders).toBeUndefined();
  });

  it('appends refreshed cookies to a redirect response without rewriting the request', async () => {
    const redirectResponse = { status: 302, headers: new Headers() } as any;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(refreshResponse(['access_token=NEWACCESS; Path=/; HttpOnly'])),
    );

    const middleware = createAuthMiddleware('http://api/merchant/auth/refresh', () => redirectResponse);
    const res = await middleware(makeRequest({ [ACCESS]: makeToken({ exp: 0 }), [REFRESH]: 'rt' }));

    expect(res).toBe(redirectResponse);
    expect(
      res.headers.getSetCookie?.().some((c: string) => c.startsWith('access_token=NEWACCESS')),
    ).toBe(true);
    expect(res.requestHeaders).toBeUndefined();
  });

  it('preserves routing headers set by the wrapped middleware when refreshing', async () => {
    const rewriteHeaders = new Headers();
    rewriteHeaders.set('x-middleware-rewrite', 'https://app.example.com/ar-SY/orders');
    const rewrittenByInner = { status: 200, headers: rewriteHeaders } as any;

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(refreshResponse(['access_token=NEWACCESS; Path=/; HttpOnly'])),
    );

    const middleware = createAuthMiddleware('http://api/merchant/auth/refresh', () => rewrittenByInner);
    const res = await middleware(makeRequest({ [ACCESS]: makeToken({ exp: 0 }), [REFRESH]: 'rt' }));

    expect(res.headers.get('x-middleware-rewrite')).toBe('https://app.example.com/ar-SY/orders');
  });

  it('passes the request through to the wrapped middleware', async () => {
    const inner = vi.fn(() => mocks.NextResponse.next());
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(refreshResponse(['access_token=NEWACCESS; Path=/; HttpOnly'])),
    );
    const middleware = createAuthMiddleware('http://api/merchant/auth/refresh', inner);
    const req = makeRequest({ [ACCESS]: makeToken({ exp: 0 }), [REFRESH]: 'rt' });
    await middleware(req);
    expect(inner).toHaveBeenCalledWith(req);
  });
});
