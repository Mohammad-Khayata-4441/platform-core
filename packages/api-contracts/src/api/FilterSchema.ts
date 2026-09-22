export type FilterFieldType = 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'id';

export type FilterOperator = '$eq' | '$like' | '$gte' | '$lte' | '$in' | '$isNull';

export type FilterCondition =
  | { $eq: string | number | boolean }
  | { $like: string }
  | { $gte: string | number }
  | { $lte: string | number }
  | { $in: (string | number)[] }
  | { $isNull: true };

/** Parsed `filters` query object (bracket notation). */
export type ParsedFilters = Record<string, FilterCondition>;

/**
 * Per-resource filter definition (server config).
 * `operators` optionally restricts the default set for the field type.
 */
export interface FilterFieldDef {
  field: string;
  type: FilterFieldType;
  /**
   * True when the column stores a LocalizedString JSON object (`{ ar, en }`).
   * Search and `$eq`/`$like` filters are translated to per-locale JSON path
   * filters instead of plain string `contains`.
   */
  localized?: boolean;
  operators?: FilterOperator[];
  enumValues?: string[];
  /** Frontend hint to load options from another resource (e.g. categories). */
  foreignResourceKey?: string;
}

export type FilterSchema = FilterFieldDef[];

/**
 * Resolved filter metadata returned in list `meta.filterOptions` for the UI.
 */
export interface ListFilterField {
  field: string;
  type: FilterFieldType;
  localized?: boolean;
  operators: FilterOperator[];
  enumValues?: string[];
  foreignResourceKey?: string;
}
