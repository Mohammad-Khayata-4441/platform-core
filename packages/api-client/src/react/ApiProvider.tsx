'use client';
import React from 'react';
import { ApiContext } from './context';

/**
 * Provides the app's `createApi(...)` result to client components.
 * The app builds its client map and passes it in as `api`.
 */
export const ApiProvider = ({ api, children }: { api: unknown; children: React.ReactNode }) => {
  return <ApiContext.Provider value={{ api }}> {children} </ApiContext.Provider>;
};
