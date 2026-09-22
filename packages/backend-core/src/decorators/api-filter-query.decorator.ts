import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import {
  buildExampleConditionForField,
  buildFilterQueryDescription,
  buildFiltersSwaggerExample,
  exampleValueForOperator,
} from '../api/filter-swagger.js';
import {
  getAllowedOperators,
  type FilterFieldDef,
  type FilterOperator,
  type FilterSchema,
} from '../api/filter-schema.js';

function buildOperatorProperty(def: FilterFieldDef, op: FilterOperator): object | undefined {
  const example = exampleValueForOperator(def, op);
  const withExample = (schema: object) =>
    example !== undefined ? { ...schema, example } : schema;

  if (op === '$eq') {
    if (def.type === 'enum' && def.enumValues) {
      return withExample({ type: 'string', enum: def.enumValues });
    }
    if (def.type === 'number') return withExample({ type: 'number' });
    if (def.type === 'boolean') return withExample({ type: 'boolean' });
    return withExample({ type: 'string' });
  }
  if (op === '$like') return withExample({ type: 'string' });
  if (op === '$gte') {
    return withExample({
      type: def.type === 'date' ? 'string' : 'number',
      ...(def.type === 'date' ? { format: 'date-time' } : {}),
    });
  }
  if (op === '$lte') {
    return withExample({
      type: def.type === 'date' ? 'string' : 'number',
      ...(def.type === 'date' ? { format: 'date-time' } : {}),
    });
  }
  if (op === '$in') {
    return withExample({
      type: 'array',
      items:
        def.type === 'enum' && def.enumValues
          ? { type: 'string', enum: def.enumValues }
          : { type: 'string' },
    });
  }
  if (op === '$isNull') return withExample({ type: 'boolean', enum: [true] });
  return undefined;
}

function buildFieldSchema(def: FilterFieldDef): object {
  const ops = getAllowedOperators(def);
  const properties: Record<string, object> = {};

  for (const op of ops) {
    const prop = buildOperatorProperty(def, op);
    if (prop) properties[op] = prop;
  }

  const fieldExample = buildExampleConditionForField(def);

  return {
    type: 'object',
    description: `Filter on \`${def.field}\` (${def.type})`,
    properties,
    ...(fieldExample ? { example: fieldExample } : {}),
  };
}

/**
 * Documents the `filters` query param from a per-resource {@link FilterSchema}.
 * Apply on list handlers (or via {@link createCrudController} when `filterSchema` is set).
 */
export function ApiFilterQuery(schema: FilterSchema): MethodDecorator {
  const properties: Record<string, object> = {};
  for (const def of schema) {
    properties[def.field] = buildFieldSchema(def);
  }

  return applyDecorators(
    ApiQuery({
      name: 'filters',
      required: false,
      style: 'deepObject',
      explode: true,
      description: buildFilterQueryDescription(schema),
      schema: {
        type: 'object',
        properties,
        example: buildFiltersSwaggerExample(schema),
      },
    }),
  );
}
