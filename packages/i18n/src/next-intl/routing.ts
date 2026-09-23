import { defineRouting } from 'next-intl/routing';
import { locales, defaultLocale } from '../index';

export function createNextIntlRouting() {
  return defineRouting({ locales: [...locales], defaultLocale });
}

export type Routing = ReturnType<typeof createNextIntlRouting>;
