import { buildPrismaWhere } from './api-query.utils';
import { getAllowedOperators, type FilterSchema } from './filter-schema';

const schema: FilterSchema = [
  { field: 'name', type: 'string', localized: true },
  { field: 'abbreviation', type: 'string' },
];

describe('buildPrismaWhere — search', () => {
  it('searches localized Json fields per locale and plain columns with contains', () => {
    const where = buildPrismaWhere({ search: 'س', searchIn: 'name,abbreviation' }, schema);

    expect(where).toEqual({
      OR: [
        { name: { path: ['ar'], string_contains: 'س', mode: 'insensitive' } },
        { name: { path: ['en'], string_contains: 'س', mode: 'insensitive' } },
        { abbreviation: { contains: 'س', mode: 'insensitive' } },
      ],
    });
  });

  it('keeps contains for fields missing from the schema', () => {
    const where = buildPrismaWhere({ search: 'kg', searchIn: 'name' });

    expect(where).toEqual({
      OR: [{ name: { contains: 'kg', mode: 'insensitive' } }],
    });
  });
});

describe('buildPrismaWhere — localized filters', () => {
  it('translates $like on localized fields to per-locale path filters', () => {
    const where = buildPrismaWhere({ filters: { name: { $like: 'كغ' } } }, schema);

    expect(where).toEqual({
      AND: [
        {
          OR: [
            { name: { path: ['ar'], string_contains: 'كغ', mode: 'insensitive' } },
            { name: { path: ['en'], string_contains: 'كغ', mode: 'insensitive' } },
          ],
        },
      ],
    });
  });

  it('translates $eq on localized fields to per-locale path equality', () => {
    const where = buildPrismaWhere({ filters: { name: { $eq: 'كغ' } } }, schema);

    expect(where).toEqual({
      AND: [
        {
          OR: [
            { name: { path: ['ar'], equals: 'كغ' } },
            { name: { path: ['en'], equals: 'كغ' } },
          ],
        },
      ],
    });
  });

  it('skips operators that are not allowed on localized fields', () => {
    const where = buildPrismaWhere({ filters: { name: { $isNull: true } } }, schema);

    expect(where).toEqual({});
  });
});

describe('getAllowedOperators', () => {
  it('restricts localized fields to $eq and $like', () => {
    expect(getAllowedOperators({ field: 'name', type: 'string', localized: true })).toEqual([
      '$eq',
      '$like',
    ]);
  });
});
