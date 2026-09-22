/**
 * Resolves a possibly-relative media path against the API base URL.
 * The base defaults to `NEXT_PUBLIC_API_URL`; pass it explicitly if needed.
 */
export function resolveMediaUrl(url: string, baseUrl?: string): string {
  if (!url) return url;
  if (/^(https?|blob|data):\/\//i.test(url)) return url;

  const base = (baseUrl ?? process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
  return `${base}${url.startsWith('/') ? url : `/${url}`}`;
}
