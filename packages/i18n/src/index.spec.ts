import { describe, it, expect } from 'vitest';
import { getMessages, locales, defaultLocale, isLocale } from './index';
import { I18nService } from './nest/i18n.service';

describe('i18n registry', () => {
  it('exposes ar + en with ar as default', () => {
    expect([...locales]).toEqual(['ar', 'en']);
    expect(defaultLocale).toBe('ar');
  });

  it('returns a system namespace for both locales', () => {
    expect(getMessages('en').system).toBeTruthy();
    expect(getMessages('ar').system).toBeTruthy();
  });

  it('validates locales', () => {
    expect(isLocale('ar')).toBe(true);
    expect(isLocale('fr')).toBe(false);
  });
});

describe('I18nService', () => {
  const service = new I18nService();

  it('resolves a known locale from Accept-Language', () => {
    expect(service.resolveLocale('en-US,en;q=0.9')).toBe('en');
    expect(service.resolveLocale('fr-FR')).toBe('ar');
  });

  it('translates a nested key and falls back to the key when missing', () => {
    expect(service.translate('system.confirm.confirm', 'en')).toBe('Confirm');
    expect(service.translate('system.missing.key', 'en')).toBe('system.missing.key');
  });
});
