import { ApiQueryOptions } from "@core/api-contracts";

/** Structured filter condition (matches backend FilterCondition DSL). */
type FilterConditionPayload = {
  $eq?: string | number | boolean;
  $like?: string;
  $gte?: string | number;
  $lte?: string | number;
  $in?: (string | number)[];
  $isNull?: true;
};

function appendFilterCondition(
  params: URLSearchParams,
  field: string,
  condition: FilterConditionPayload,
): void {
  if (condition.$eq !== undefined) {
    params.append(`filters[${field}][$eq]`, String(condition.$eq));
    return;
  }
  if (condition.$like !== undefined) {
    params.append(`filters[${field}][$like]`, condition.$like);
    return;
  }
  if (condition.$gte !== undefined) {
    params.append(`filters[${field}][$gte]`, String(condition.$gte));
    return;
  }
  if (condition.$lte !== undefined) {
    params.append(`filters[${field}][$lte]`, String(condition.$lte));
    return;
  }
  if (condition.$in !== undefined) {
    condition.$in.forEach((v) => params.append(`filters[${field}][$in][]`, String(v)));
    return;
  }
  if (condition.$isNull === true) {
    params.append(`filters[${field}][$isNull]`, "true");
  }
}

/**
 * Serializes ApiQueryOptions to URL query string format
 * Compatible with NestJS class-transformer query parsing
 */
export function serializeQueryOptions(query: ApiQueryOptions): string {
  const params = new URLSearchParams();

  if (query.pagination) {
    if (query.pagination.page !== undefined) {
      params.append("pagination[page]", String(query.pagination.page));
    }
    if (query.pagination.limit !== undefined) {
      params.append("pagination[limit]", String(query.pagination.limit));
    }
  }

  if (query.sort) {
    if (query.sort.field) {
      params.append("sort[field]", query.sort.field);
    }
    if (query.sort.order) {
      params.append("sort[order]", query.sort.order);
    }
  }

  if (query.filters) {
    Object.entries(query.filters).forEach(([field, condition]) => {
      if (condition && typeof condition === "object") {
        appendFilterCondition(params, field, condition as FilterConditionPayload);
      }
    });
  }

  if (query.include) {
    Object.entries(query.include).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(`include[${key}]`, String(value));
      }
    });
  }

  if (query.search) {
    if (query.search.value) {
      params.append("search[value]", query.search.value);
    }
    if (query.search.keys && query.search.keys.length > 0) {
      query.search.keys.forEach((key) => {
        params.append("search[keys][]", key);
      });
    }
  }

  return params.toString();
}
