import type { SeoLocale } from "./types";

/** Path with locale prefix applied per next-intl 'as-needed' (default locale = no prefix). */
export function localePath(
  path: string,
  localeKey: string,
  defaultLocaleKey?: string,
): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!localeKey || localeKey === defaultLocaleKey) return p;
  return `/${localeKey}${p}`;
}

export function buildAlternateLanguages(opts: {
  host: string;
  path: string;
  locales: SeoLocale[];
  defaultLocaleKey?: string;
}): Record<string, string> {
  const { host, path, locales, defaultLocaleKey } = opts;
  const base = host.replace(/\/+$/, "");
  const out: Record<string, string> = {};
  for (const l of locales) {
    out[l.key] = `${base}${localePath(path, l.key, defaultLocaleKey)}`;
  }
  const def = defaultLocaleKey ?? locales[0]?.key ?? "";
  out["x-default"] = `${base}${localePath(path, def, defaultLocaleKey)}`;
  return out;
}

export function buildCanonicalUrl(opts: {
  host: string;
  path: string;
  localeKey?: string;
  defaultLocaleKey?: string;
}): string {
  const { host, path, localeKey, defaultLocaleKey } = opts;
  const base = host.replace(/\/+$/, "");
  return `${base}${localePath(path, localeKey ?? "", defaultLocaleKey)}`;
}
