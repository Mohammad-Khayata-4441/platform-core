import type { ICrudClient } from './infra/crud-client';

/**
 * A map of resource key → CRUD client. The consuming app builds its own map and
 * passes it to {@link createApi}; the core does not know about any concrete
 * resources.
 */
export type ClientMap = Record<string, ICrudClient>;

export function createApi<T extends ClientMap>(clients: T): T {
  return clients;
}
