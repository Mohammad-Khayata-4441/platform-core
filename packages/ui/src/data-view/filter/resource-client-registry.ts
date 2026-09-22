import type { ICrudClient } from '@core/api-client';

let resourceClients: Record<string, ICrudClient> = {};

/**
 * Apps inject the clients used for foreign-key filter lookups. `@core/ui` does
 * not hardcode any resource keys.
 */
export function setResourceClients(map: Record<string, ICrudClient>): void {
  resourceClients = map;
}

export function resolveResourceClient(
  _api: unknown,
  resourceKey: string | undefined,
): ICrudClient | null {
  if (!resourceKey) return null;
  return resourceClients[resourceKey] ?? null;
}

export function getResourceLabel(item: { name?: string; id?: string }): string {
  return item.name ?? String(item.id ?? '');
}
