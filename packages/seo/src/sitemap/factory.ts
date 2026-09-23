import type { MetadataRoute } from "next";

export interface SitemapEntry {
  url: string;
  lastMod?: string | Date;
  alternates?: { languages?: Record<string, string> };
}

export function buildSitemap(entries: SitemapEntry[]): MetadataRoute.Sitemap {
  return entries.map((e) => ({
    url: e.url,
    lastMod: e.lastMod ? new Date(e.lastMod).toISOString() : undefined,
    ...(e.alternates?.languages
      ? { alternates: { languages: e.alternates.languages } }
      : {}),
  }));
}
