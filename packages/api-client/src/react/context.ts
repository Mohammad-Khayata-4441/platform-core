import { createContext } from 'react';

export interface ApiContextValue {
  /** The object returned by `createApi` (a map of resource key → CRUD client). */
  api: unknown;
}

export const ApiContext = createContext<ApiContextValue>({ api: null });
