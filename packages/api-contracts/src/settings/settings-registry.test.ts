import { describe, it, expect } from 'vitest';
import {
  settingsRegistry,
  getDefaults,
  mergeWithDefaults,
  groupByCategory,
  validateSettingsPatch,
} from './settings-registry';

describe('settings registry helpers', () => {
  it('getDefaults returns every registry key with its default', () => {
    const defaults = getDefaults();
    expect(Object.keys(defaults).sort()).toEqual(Object.keys(settingsRegistry).sort());
    expect(defaults.timezone).toBe('UTC');
  });

  it('mergeWithDefaults overlays stored rows and ignores unknown keys', () => {
    const merged = mergeWithDefaults([
      { key: 'timezone', value: 'Europe/Istanbul' },
      { key: 'ghost', value: 'x' },
    ]);
    expect(merged.timezone).toBe('Europe/Istanbul');
    expect(merged.locale).toBe('en');
    expect('ghost' in merged).toBe(false);
  });

  it('groupByCategory buckets keys by their registry category', () => {
    const grouped = groupByCategory(getDefaults());
    expect(grouped.localization.timezone).toBe('UTC');
    expect('timezone' in grouped.general).toBe(false);
  });

  it('validateSettingsPatch accepts valid values and coerces via zod', () => {
    const { values, errors } = validateSettingsPatch({ firstDayOfWeek: 0, locale: 'ar' });
    expect(errors).toEqual({});
    expect(values).toEqual({ firstDayOfWeek: 0, locale: 'ar' });
  });

  it('validateSettingsPatch reports per-key errors and unknown keys', () => {
    const { values, errors } = validateSettingsPatch({ firstDayOfWeek: 99, nope: 1 });
    expect(values).toEqual({});
    expect(errors.firstDayOfWeek?.length).toBeGreaterThan(0);
    expect(errors.nope).toEqual(['Unknown setting "nope"']);
  });

  it('validateSettingsPatch puts an invalid value for a known key in errors, not values', () => {
    const { values, errors } = validateSettingsPatch({ timezone: '' });
    expect(values).toEqual({});
    expect(errors.timezone).toBeDefined();
    expect(errors.timezone!.length).toBeGreaterThan(0);
  });
});
