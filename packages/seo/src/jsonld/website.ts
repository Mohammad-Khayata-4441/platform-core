import type { SiteSeoInput } from "../types";
import { buildCanonicalUrl } from "../hreflang";

export function websiteJsonLd(
  input: SiteSeoInput,
  searchPath = "/search",
): Record<string, unknown> {
  const url = buildCanonicalUrl({
    host: input.host,
    path: "/",
    localeKey: input.defaultLocaleKey,
    defaultLocaleKey: input.defaultLocaleKey,
  });
  const searchUrl = buildCanonicalUrl({
    host: input.host,
    path: searchPath,
    localeKey: input.defaultLocaleKey,
    defaultLocaleKey: input.defaultLocaleKey,
  });
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: input.name,
    url,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${searchUrl}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}
