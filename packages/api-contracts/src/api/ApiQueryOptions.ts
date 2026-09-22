import type { ParsedFilters } from './FilterSchema.js';

export type SortOrder = 'asc' | 'desc';

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface SortOptions<TFields extends string = string> {
  field?: TFields;
  order?: SortOrder;
}

export interface IncludeOptions {
  [relation: string]: boolean;
}

export type SearchOptions<TFields extends string = string> = {
  value: string;
  keys: TFields[];
};

export interface ApiQueryOptions<TFields extends string = string> {
  pagination?: PaginationOptions;
  sort?: SortOptions<TFields>;
  /** Structured filter DSL: one operator per field. */
  filters?: ParsedFilters;
  include?: IncludeOptions;
  search?: SearchOptions;
}

export type {
  FilterCondition,
  FilterFieldDef,
  FilterFieldType,
  FilterOperator,
  FilterSchema,
  ListFilterField,
  ParsedFilters,
} from './FilterSchema.js';
