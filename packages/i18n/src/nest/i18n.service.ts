import { Inject, Injectable } from '@nestjs/common';
import { getMessages, defaultLocale, locales as defaultLocales, type Locale } from '../index';

export const I18N_CONFIG = Symbol('CORE_I18N_CONFIG');

export interface I18nConfig {
  locales: string[];
  defaultLocale: string;
}

export const DEFAULT_I18N_CONFIG: I18nConfig = {
  locales: [...defaultLocales],
  defaultLocale,
};

@Injectable()
export class I18nService {
  private readonly config: I18nConfig;

  constructor(@Inject(I18N_CONFIG) config?: I18nConfig) {
    this.config = config ?? DEFAULT_I18N_CONFIG;
  }

  resolveLocale(acceptLanguage?: string): string {
    if (!acceptLanguage) return this.config.defaultLocale;
    const lang = acceptLanguage.split(',')[0]?.split('-')[0]?.toLowerCase();
    return lang && this.config.locales.includes(lang) ? lang : this.config.defaultLocale;
  }

  translate(key: string, locale?: string): string {
    const messages = getMessages((locale as Locale) ?? (this.config.defaultLocale as Locale)) as Record<
      string,
      unknown
    >;
    const value = key
      .split('.')
      .reduce<unknown>((acc, part) => (acc as Record<string, unknown> | undefined)?.[part], messages);
    return typeof value === 'string' ? value : key;
  }
}
