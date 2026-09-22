// Framework-agnostic root export — zero `next`/`react` imports by design, so
// `apps/api` (NestJS) can depend on this package for the cookie-name constants
// shared with the frontends, without dragging Next.js into the API build.
export { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, REFRESH_COOKIE_PATHS } from './constants.js';
export type { AuthAudience } from './constants.js';
export type { AuthClaims } from './types.js';
