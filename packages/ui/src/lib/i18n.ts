/**
 * P2 i18n shim. `@core/i18n` (next-intl) lands in P3; until then these return
 * humanized English labels derived from the message key so the UI is readable.
 */
export function useTranslations(_namespace?: string) {
  return (key: string, _values?: Record<string, unknown>): string => {
    const last = key.split('.').pop() ?? key;
    return last
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/^./, (c) => c.toUpperCase());
  };
}

export function useLocale(): string {
  return 'en';
}
