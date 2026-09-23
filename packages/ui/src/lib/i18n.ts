/**
 * Real translations via next-intl. Components call `useTranslations(namespace)`;
 * the app provides `NextIntlClientProvider` (see `apps/dashboard`). When no
 * provider is present (e.g. isolated component tests), `fallbackTranslator`
 * returns humanized English derived from the key.
 */
export { useTranslations, useLocale } from 'next-intl';

export function fallbackTranslator(_namespace?: string) {
  return (key: string, _values?: Record<string, unknown>): string => {
    const last = key.split('.').pop() ?? key;
    return last
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/^./, (c) => c.toUpperCase());
  };
}
