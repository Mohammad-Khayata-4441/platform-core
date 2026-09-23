export function stripProto(input: string): string {
  return input.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

export interface ResolveHostInput {
  slug?: string | null;
  baseDomain?: string | null;
  requestHost?: string | null;
}

/** Canonical origin for a site: https://{slug}.{baseDomain}, else request host, else localhost. */
export function resolveCanonicalHost({
  slug,
  baseDomain,
  requestHost,
}: ResolveHostInput): string {
  if (slug && baseDomain) {
    return `https://${stripProto(slug)}.${stripProto(baseDomain)}`;
  }
  if (requestHost) {
    const clean = stripProto(requestHost);
    return requestHost.startsWith("http") ? requestHost : `https://${clean}`;
  }
  return "https://localhost";
}

export function buildAbsoluteUrl(host: string, path: string): string {
  const base = host.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
