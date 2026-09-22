import { CrudClient } from '../infra/crud-client';
import type { ApiClient } from '../infra/client';
import { itemsResource } from '@core/api-contracts';

/** EXAMPLE — remove via the scaffold CLI. */
export class ItemsClient extends CrudClient<typeof itemsResource> {
  constructor(apiClient: ApiClient) {
    super(apiClient, itemsResource);
  }
}
