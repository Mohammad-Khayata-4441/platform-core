import type { ApiQueryOptionsDto } from './api-query-options.dto.js';
import {
  conditionUsesOperator,
  getAllowedOperators,
  isOperatorAllowedForField,
  type FilterCondition,
  type FilterFieldType,
  type FilterSchema,
} from './filter-schema.js';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

function coerce(value: unknown, type: FilterFieldType): unknown {
  if (type === 'number') return Number(value);
  if (type === 'date') return new Date(value as string | number);
  if (type === 'boolean') return value === 'true' || value === true;
  return value;
}

function conditionToPrisma(
  condition: FilterCondition,
  fieldType: FilterFieldType,
): Record<string, unknown> {
  if ('$eq' in condition) return { equals: coerce(condition.$eq, fieldType) };
  if ('$like' in condition) return { contains: condition.$like, mode: 'insensitive' };
  if ('$gte' in condition) return { gte: coerce(condition.$gte, fieldType) };
  if ('$lte' in condition) return { lte: coerce(condition.$lte, fieldType) };
  if ('$in' in condition) {
    return { in: condition.$in.map((v) => coerce(v, fieldType)) };
  }
  if ('$isNull' in condition) return { equals: null };
  return {};
}

/** Locales stored in every LocalizedString Json column. */
export const DEFAULT_LOCALIZED_PATHS = ['ar', 'en'] as const;

function localizedContains(
  field: string,
  value: string,
  paths: readonly string[],
): Record<string, unknown>[] {
  return paths.map((path) => ({
    [field]: { path: [path], string_contains: value, mode: 'insensitive' },
  }));
}

function localizedEquals(
  field: string,
  value: string | number | boolean,
  paths: readonly string[],
): Record<string, unknown>[] {
  return paths.map((path) => ({
    [field]: { path: [path], equals: value },
  }));
}

function localizedFilter(
  field: string,
  condition: FilterCondition,
  paths: readonly string[],
): Record<string, unknown>[] | null {
  if ('$like' in condition) return localizedContains(field, condition.$like, paths);
  if ('$eq' in condition) return localizedEquals(field, condition.$eq, paths);
  return null;
}

export const resolvePagination = (query?: ApiQueryOptionsDto): PaginationParams => {
  const page = query?.page && query.page > 0 ? query.page : 1;
  const limit = query?.limit && query.limit > 0 ? query.limit : 10;

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

/**
 * Converts {@link ApiQueryOptionsDto} search + filter fields into a Prisma `where` clause.
 * Filters are only applied when a {@link FilterSchema} is provided (safelist).
 */
export function buildPrismaWhere(
  query: ApiQueryOptionsDto,
  schema?: FilterSchema,
  localizedPaths: readonly string[] = DEFAULT_LOCALIZED_PATHS,
): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  const schemaMap = new Map((schema ?? []).map((def) => [def.field, def]));

  if (query.search && query.searchIn) {
    const fields = query.searchIn.split(',').map((f) => f.trim()).filter(Boolean);
    where['OR'] = fields.flatMap((field) =>
      schemaMap.get(field)?.localized
        ? localizedContains(field, query.search as string, localizedPaths)
        : [{ [field]: { contains: query.search, mode: 'insensitive' } }],
    );
  }

  if (query.filters && schema) {
    for (const [field, rawCondition] of Object.entries(query.filters)) {
      const def = schemaMap.get(field);
      if (!def) continue;

      const condition = rawCondition as FilterCondition;
      if (!isOperatorAllowedForField(condition, def)) continue;

      if (def.localized) {
        const localized = localizedFilter(field, condition, localizedPaths);
        if (localized) {
          const and = (where['AND'] as Record<string, unknown>[] | undefined) ?? [];
          and.push({ OR: localized });
          where['AND'] = and;
          continue;
        }
      }

      where[field] = conditionToPrisma(condition, def.type);
    }
  }

  return where;
}

/**
 * Converts {@link ApiQueryOptionsDto} sort fields into a Prisma `orderBy` clause.
 * Defaults to `{ createdAt: 'desc' }` when no sortField is provided.
 */
export function buildPrismaOrderBy(query: ApiQueryOptionsDto): Record<string, unknown> {
  if (query.sortField) {
    return { [query.sortField]: query.sortOrder ?? 'asc' };
  }
  return { createdAt: 'desc' };
}
