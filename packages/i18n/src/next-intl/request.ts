import { getRequestConfig } from 'next-intl/server';
import { getMessages, defaultLocale, isLocale, type Locale } from '../index';

export function createNextIntlRequestConfig() {
  return getRequestConfig(async ({ locale }) => {
    const resolved: Locale = isLocale(locale ?? '') ? (locale as Locale) : defaultLocale;
    return { locale: resolved, messages: getMessages(resolved) };
  });
}
