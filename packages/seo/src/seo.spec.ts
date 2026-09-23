import { describe, it, expect } from 'vitest';
import { resolveCanonicalHost, buildAbsoluteUrl } from './host';
import { buildAlternateLanguages, localePath } from './hreflang';

describe('host', () => {
  it('builds a canonical host from slug + baseDomain', () => {
    expect(resolveCanonicalHost({ slug: 'shop', baseDomain: 'example.com' })).toBe(
      'https://shop.example.com',
    );
  });
  it('falls back to the request host', () => {
    expect(resolveCanonicalHost({ requestHost: 'example.com' })).toBe('https://example.com');
  });
  it('builds absolute urls', () => {
    expect(buildAbsoluteUrl('https://example.com/', 'items')).toBe('https://example.com/items');
  });
});

describe('hreflang', () => {
  it('omits the prefix for the default locale', () => {
    expect(localePath('/items', 'ar', 'ar')).toBe('/items');
    expect(localePath('/items', 'en', 'ar')).toBe('/en/items');
  });
  it('builds alternate languages incl. x-default', () => {
    const alt = buildAlternateLanguages({
      host: 'https://example.com',
      path: '/items',
      locales: [{ key: 'ar' }, { key: 'en' }],
      defaultLocaleKey: 'ar',
    });
    expect(alt.en).toBe('https://example.com/en/items');
    expect(alt['x-default']).toBe('https://example.com/items');
  });
});
