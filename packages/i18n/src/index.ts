import enSystem from './locales/en/system.json';
import arSystem from './locales/ar/system.json';

export const locales = ['ar', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'ar';

const catalogs: Record<Locale, Record<string, unknown>> = {
  en: enSystem,
  ar: arSystem,
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function getMessages(locale: Locale): Record<string, unknown> {
  return catalogs[locale] ?? catalogs[defaultLocale];
}

export { enSystem, arSystem };
