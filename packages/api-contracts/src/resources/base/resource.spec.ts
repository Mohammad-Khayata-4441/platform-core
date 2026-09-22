import { describe, it, expect } from 'vitest';
import { defineResource } from './resource';

describe('defineResource', () => {
  it('preserves key and routes', () => {
    const r = defineResource({
      key: 'items',
      routes: { list: 'items', byId: 'items/{id}' },
    });
    expect(r.key).toBe('items');
    expect(r.routes.byId).toBe('items/{id}');
  });
});
