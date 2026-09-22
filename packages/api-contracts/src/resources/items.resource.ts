import { defineCrudResource } from './base/crud-resource';

export const itemsResource = defineCrudResource({
  key: 'items',
  routes: {
    list: '/example/items',
    show: '/example/items/{id}',
    create: '/example/items',
    update: '/example/items/{id}',
    delete: '/example/items/{id}',
    bulkDelete: '/example/items',
    bulkUpdate: '/example/items',
  },
});
