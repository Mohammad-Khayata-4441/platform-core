import type {
  FilterCondition,
  FilterFieldDef,
  FilterFieldType,
  FilterOperator,
  FilterSchema,
  ParsedFilters,
} from '@core/api-contracts';

export type {
  FilterCondition,
  FilterFieldDef,
  FilterFieldType,
  FilterOperator,
  FilterSchema,
  ListFilterField,
  ParsedFilters,
} from '@core/api-contracts';

const OPERATORS_BY_TYPE: Record<FilterFieldType, FilterOperator[]> = {
  string: ['$eq', '$like', '$in', '$isNull'],
  id: ['$eq', '$in', '$isNull'],
  number: ['$eq', '$gte', '$lte', '$in', '$isNull'],
  date: ['$eq', '$gte', '$lte', '$isNull'],
  boolean: ['$eq', '$isNull'],
  enum: ['$eq', '$in', '$isNull'],
};

/** Localized Json columns only support substring/equality filters (no `$in`/`$isNull`). */
const LOCALIZED_OPERATORS: FilterOperator[] = ['$eq', '$like'];

export function getAllowedOperators(def: FilterFieldDef): FilterOperator[] {
  const defaults = OPERATORS_BY_TYPE[def.type];
  const allowed = def.localized
    ? defaults.filter((op) => LOCALIZED_OPERATORS.includes(op))
    : defaults;
  return def.operators ? allowed.filter((op) => def.operators!.includes(op)) : allowed;
}

export function conditionUsesOperator(
  condition: FilterCondition,
): FilterOperator | undefined {
  if ('$eq' in condition) return '$eq';
  if ('$like' in condition) return '$like';
  if ('$gte' in condition) return '$gte';
  if ('$lte' in condition) return '$lte';
  if ('$in' in condition) return '$in';
  if ('$isNull' in condition) return '$isNull';
  return undefined;
}

export function isOperatorAllowedForField(
  condition: FilterCondition,
  def: FilterFieldDef,
): boolean {
  const op = conditionUsesOperator(condition);
  return op !== undefined && getAllowedOperators(def).includes(op);
}
