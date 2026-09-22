import type {
  FilterCondition,
  FilterFieldDef,
  FilterOperator,
  FilterSchema,
  ListFilterField,
  ParsedFilters,
} from '@core/api-contracts';
import { getAllowedOperators } from './filter-schema.js';

const SAMPLE_ID = '018e1234-abcd-7000-a001-000000000001';

/** One representative condition per field (for Swagger / docs). */
export function buildExampleConditionForField(def: FilterFieldDef): FilterCondition | undefined {
  const ops = getAllowedOperators(def);

  switch (def.type) {
    case 'string':
      if (ops.includes('$like')) return { $like: `sample-${def.field}` };
      if (ops.includes('$eq')) return { $eq: `sample-${def.field}` };
      if (ops.includes('$in')) return { $in: [`sample-${def.field}`] };
      break;
    case 'id':
      if (ops.includes('$eq')) return { $eq: SAMPLE_ID };
      if (ops.includes('$in')) return { $in: [SAMPLE_ID] };
      break;
    case 'number':
      if (ops.includes('$gte')) return { $gte: 10 };
      if (ops.includes('$lte')) return { $lte: 100 };
      if (ops.includes('$eq')) return { $eq: 10 };
      if (ops.includes('$in')) return { $in: [10, 20] };
      break;
    case 'boolean':
      if (ops.includes('$eq')) return { $eq: true };
      break;
    case 'date':
      if (ops.includes('$gte')) return { $gte: '2024-01-01T00:00:00.000Z' };
      if (ops.includes('$lte')) return { $lte: '2024-12-31T23:59:59.999Z' };
      if (ops.includes('$eq')) return { $eq: '2024-06-15T12:00:00.000Z' };
      break;
    case 'enum': {
      const value = def.enumValues?.[0] ?? 'active';
      if (ops.includes('$eq')) return { $eq: value };
      if (ops.includes('$in')) return { $in: def.enumValues?.slice(0, 2) ?? [value] };
      break;
    }
  }

  if (ops.includes('$isNull')) return { $isNull: true };
  return undefined;
}

/** Full `filters` query object example derived from a resource {@link FilterSchema}. */
export function buildFiltersSwaggerExample(schema: FilterSchema): ParsedFilters {
  const example: ParsedFilters = {};
  for (const def of schema) {
    const condition = buildExampleConditionForField(def);
    if (condition) example[def.field] = condition;
  }
  return example;
}

function formatQueryParam(field: string, condition: FilterCondition): string {
  if ('$in' in condition) {
    const first = condition.$in[0];
    return `filters[${field}][$in][]=${encodeURIComponent(String(first))}`;
  }
  const op = Object.keys(condition)[0] as FilterOperator;
  const value = condition[op as keyof FilterCondition];
  return `filters[${field}][${op}]=${encodeURIComponent(String(value))}`;
}

/** Human-readable query-string hint using fields from the resource schema. */
export function buildFilterQueryDescription(schema: FilterSchema): string {
  const example = buildFiltersSwaggerExample(schema);
  const parts = Object.entries(example).map(([field, condition]) =>
    formatQueryParam(field, condition),
  );

  if (parts.length === 0) {
    return 'Structured filters (one operator per field).';
  }

  return `Structured filters. Example: ${parts.join('&')}`;
}

/** Example value for a single operator property in OpenAPI field schemas. */
export function exampleValueForOperator(
  def: FilterFieldDef,
  op: FilterOperator,
): string | number | boolean | string[] | undefined {
  const condition = buildExampleConditionForField(def);
  if (!condition) return undefined;
  if (op in condition) return condition[op as keyof FilterCondition] as string | number | boolean | string[];
  return undefined;
}

export function buildListFilterOptionsExample(schema: FilterSchema): ListFilterField[] {
  return schema.map((def) => ({
    field: def.field,
    type: def.type,
    ...(def.localized !== undefined ? { localized: def.localized } : {}),
    operators: getAllowedOperators(def),
    ...(def.enumValues !== undefined ? { enumValues: def.enumValues } : {}),
    ...(def.foreignResourceKey !== undefined
      ? { foreignResourceKey: def.foreignResourceKey }
      : {}),
  }));
}
