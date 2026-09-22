'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { FieldValues, Path, PathValue, UseFormReturn } from 'react-hook-form';

/** Relational values the API can pre-fill on creation forms. */
export type FormDefaults = Record<string, { id: string } | null | undefined>;

/** Declarative opt-in: form field name → default value to pre-fill it from. */
export type FormDefaultsMap<TValues extends FieldValues> = Partial<Record<Path<TValues>, string>>;

/**
 * Loads server-side form defaults. The core ships an empty implementation;
 * apps override it by setting a fetcher via `setFormDefaultsFetcher`.
 */
let fetchDefaults: () => Promise<FormDefaults> = async () => ({});

export function setFormDefaultsFetcher(fetcher: () => Promise<FormDefaults>): void {
  fetchDefaults = fetcher;
}

export function useFormDefaultsQuery() {
  return useQuery({
    queryKey: ['form-defaults'],
    queryFn: () => fetchDefaults(),
    staleTime: 5 * 60 * 1000,
  });
}

function isEmptyValue(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'object') return !(value as { id?: string }).id;
  return value === '';
}

/**
 * Pre-fills a creation form's empty fields from configured defaults. Runs only
 * when `enabled`, never overwrites a value the mapper or user already set, and
 * never marks fields dirty.
 */
export function useApplyFormDefaults<TValues extends FieldValues>({
  form,
  map,
  enabled,
}: {
  form: UseFormReturn<TValues>;
  map: FormDefaultsMap<TValues>;
  enabled: boolean;
}): void {
  const { data: defaults } = useFormDefaultsQuery();

  useEffect(() => {
    if (!enabled || !defaults) return;
    for (const [field, key] of Object.entries(map) as Array<[Path<TValues>, string]>) {
      const value = defaults[key];
      if (!value) continue;
      if (!isEmptyValue(form.getValues(field))) continue;
      form.setValue(field, value as PathValue<TValues, typeof field>, { shouldDirty: false });
    }
  }, [enabled, defaults, form]); // eslint-disable-line react-hooks/exhaustive-deps
}
