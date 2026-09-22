import { ApiClient, createApi } from '@core/api-client';
import { ItemsClient } from '@core/api-client/clients';

export function buildApi(baseUrl: string) {
  const http = new ApiClient(baseUrl);
  return createApi({ items: new ItemsClient(http) });
}

export type AppApi = ReturnType<typeof buildApi>;
