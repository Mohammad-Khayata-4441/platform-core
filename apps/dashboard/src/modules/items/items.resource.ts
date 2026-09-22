import { generateResource } from '@core/ui/data-view';
import type { ItemsClient } from '@core/api-client/clients';
import type { AppApi } from '@/config/api';

export const ItemsResource = generateResource<ItemsClient>({
  getClient: (api) => (api as AppApi).items,
  paramKey: 'items',
  list: {
    searchIn: ['sku'],
    defaultSort: { field: 'sku', order: 'asc' },
  },
});
