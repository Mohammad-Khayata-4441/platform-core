export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

/**
 * Refresh-endpoint paths per audience, as seen by the browser through each
 * app's `/backend` proxy rewrite. These are the URLs the client-side silent
 * refresh hits. The live refresh cookie itself is root-pathed (`Path=/`) so
 * the Next.js middleware and SSR `cookies()` can see it on page routes.
 */
export const REFRESH_COOKIE_PATHS = {
  public: '/backend/auth/refresh',
  merchant: '/backend/merchant/auth/refresh',
  admin: '/backend/admin/auth/refresh',
} as const;

export type AuthAudience = keyof typeof REFRESH_COOKIE_PATHS;
