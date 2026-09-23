import type { SiteSeoInput } from "../types";
import { buildCanonicalUrl } from "../hreflang";

export function localBusinessJsonLd(
  input: SiteSeoInput,
): Record<string, unknown> {
  const url = buildCanonicalUrl({
    host: input.host,
    path: "/",
    localeKey: input.defaultLocaleKey,
    defaultLocaleKey: input.defaultLocaleKey,
  });
  const address = input.address
    ? {
        "@type": "PostalAddress",
        streetAddress: input.address.streetAddress,
        addressLocality: input.address.addressLocality,
        addressRegion: input.address.addressRegion,
        addressCountry: input.address.addressCountry,
      }
    : undefined;

  const geo = input.address?.geo
    ? {
        "@type": "GeoCoordinates",
        latitude: input.address.geo.latitude,
        longitude: input.address.geo.longitude,
      }
    : undefined;

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: input.name,
    url,
    description: input.description ?? undefined,
    image: input.images?.length ? input.images : (input.logo ?? undefined),
    logo: input.logo ?? undefined,
  };
  if (address) data.address = address;
  if (geo) data.geo = geo;
  if (input.address?.telephone) data.telephone = input.address.telephone;
  if (input.address?.openingHours)
    data.openingHours = input.address.openingHours;
  if (input.priceRange) data.priceRange = input.priceRange;
  if (input.socialLinks?.length)
    data.sameAs = input.socialLinks.map((s) => s.url);
  return data;
}
