export interface SeoLocale {
  key: string;
  isRtl?: boolean;
}

export interface SeoSocialLink {
  platform: string;
  url: string;
}

export interface SeoAddress {
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
  addressCountry?: string;
  geo?: { latitude: number; longitude: number };
  telephone?: string;
  openingHours?: string;
}

/** Generic site/product-agnostic SEO input. */
export interface SiteSeoInput {
  name: string;
  description?: string | null;
  logo?: string | null;
  images?: string[] | null;
  /** Canonical origin, e.g. https://app.example.com (no trailing slash). */
  host: string;
  locales: SeoLocale[];
  defaultLocaleKey?: string;
  /** Path WITHOUT locale segment, e.g. "/items/foo". Default "/". */
  path?: string;
  /** Current page locale (drives canonical prefix under as-needed). */
  locale?: string;
  socialLinks?: SeoSocialLink[];
  address?: SeoAddress;
  priceRange?: string;
}
