export interface ServerClientOptions {
  /** Absolute base URL of the API. */
  baseUrl: string;
  /** The incoming request's raw `Cookie` header, forwarded to the API. */
  cookieHeader: string;
  /** Cookie name carrying the access token. Defaults to `access_token`. */
  tokenCookieName?: string;
}

export interface ServerClient {
  baseUrl: string;
  headers: Record<string, string>;
}

/**
 * Minimal server-side client descriptor for SSR fetches. Kept framework-free so
 * it can be used from Next.js server components, route handlers, or plain Node.
 */
export function createServerClient({
  baseUrl,
  cookieHeader,
  tokenCookieName = 'access_token',
}: ServerClientOptions): ServerClient {
  void tokenCookieName;
  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    headers: { cookie: cookieHeader },
  };
}
