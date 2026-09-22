import { z } from 'zod';

export type SettingCategory = 'localization' | 'general';

export interface SettingDef {
  category: SettingCategory;
  schema: z.ZodTypeAny;
  default: unknown;
}

/**
 * Single source of truth for application-wide preferences.
 * Add a scalar preference = add one entry here. Projects extend this registry
 * with their own domain settings.
 */
export const settingsRegistry = {
  timezone: { category: 'localization', schema: z.string().min(1), default: 'UTC' },
  locale: { category: 'localization', schema: z.string().min(1), default: 'en' },
  dateFormat: {
    category: 'localization',
    schema: z.enum(['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY']),
    default: 'YYYY-MM-DD',
  },
  numberFormat: {
    category: 'localization',
    schema: z.enum(['1,234.56', '1.234,56']),
    default: '1,234.56',
  },
  firstDayOfWeek: { category: 'localization', schema: z.number().int().min(0).max(6), default: 1 },
} as const satisfies Record<string, SettingDef>;

export type SettingKey = keyof typeof settingsRegistry;

export type GroupedSettings = Record<SettingCategory, Record<string, unknown>>;

export function getDefaults(): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(settingsRegistry).map(([key, def]) => [key, def.default]),
  );
}

export function mergeWithDefaults(
  rows: Array<{ key: string; value: unknown }>,
): Record<string, unknown> {
  const merged = getDefaults();
  for (const row of rows) {
    if (row.key in settingsRegistry) merged[row.key] = row.value;
  }
  return merged;
}

export function groupByCategory(flat: Record<string, unknown>): GroupedSettings {
  const grouped: GroupedSettings = { localization: {}, general: {} };
  for (const [key, value] of Object.entries(flat)) {
    const def = settingsRegistry[key as SettingKey];
    if (def) grouped[def.category][key] = value;
  }
  return grouped;
}

export interface ValidatePatchResult {
  values: Record<string, unknown>;
  errors: Record<string, string[]>;
}

export function validateSettingsPatch(patch: Record<string, unknown>): ValidatePatchResult {
  const values: Record<string, unknown> = {};
  const errors: Record<string, string[]> = {};
  for (const [key, raw] of Object.entries(patch)) {
    const def = settingsRegistry[key as SettingKey];
    if (!def) {
      errors[key] = [`Unknown setting "${key}"`];
      continue;
    }
    const parsed = def.schema.safeParse(raw);
    if (parsed.success) values[key] = parsed.data;
    else errors[key] = parsed.error.issues.map((i) => i.message);
  }
  return { values, errors };
}
