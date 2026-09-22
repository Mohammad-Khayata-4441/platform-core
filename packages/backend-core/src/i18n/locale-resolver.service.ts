import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { LocalizedString } from '@core/api-contracts';

export type SupportedLocale = string;

export interface LocaleResolverConfig {
  /** Locales the app supports. First entry is the fallback for `resolve`. */
  locales: string[];
  /** Default locale when the request carries no usable Accept-Language. */
  fallback: string;
}

export const LOCALE_RESOLVER_CONFIG = Symbol('CORE_LOCALE_RESOLVER_CONFIG');

const DEFAULT_CONFIG: LocaleResolverConfig = { locales: ['ar', 'en'], fallback: 'ar' };

interface IncomingRequest {
  headers: Record<string, string | string[] | undefined>;
}

@Injectable({ scope: Scope.REQUEST })
export class LocaleResolverService {
  private readonly config: LocaleResolverConfig;

  constructor(
    @Inject(REQUEST) private readonly req: IncomingRequest,
    @Inject(LOCALE_RESOLVER_CONFIG) config?: LocaleResolverConfig,
  ) {
    this.config = config ?? DEFAULT_CONFIG;
  }

  get locale(): SupportedLocale {
    const header =
      typeof this.req.headers['accept-language'] === 'string'
        ? (this.req.headers['accept-language'] as string)
        : '';
    const lang = header.split(',')[0]?.split('-')[0]?.toLowerCase();
    return lang && this.config.locales.includes(lang) ? lang : this.config.fallback;
  }

  resolve(field: LocalizedString | null | undefined, fallback = ''): string {
    if (!field) return fallback;
    const record = field as unknown as Record<string, string | undefined>;
    return record[this.locale] ?? field.ar ?? fallback;
  }
}
