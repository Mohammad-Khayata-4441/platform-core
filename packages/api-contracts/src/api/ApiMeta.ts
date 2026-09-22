import type { ListFilterField } from './FilterSchema.js';

export interface ApiMeta {
  pagination?: Pagination;
  cursor?: Cursor;
  /** Resolved filterable fields for the current list resource (drives filter UI). */
  filterOptions?: ListFilterField[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
}

export interface Cursor {
  next?: string;
  previous?: string;
}
