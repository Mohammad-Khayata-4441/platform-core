'use client';

import { useContext } from 'react';
import { ApiContext } from './context';

/** Returns the app's API client map provided by `ApiProvider`. */
export const useApi = <T = unknown,>(): T => {
  const { api } = useContext(ApiContext);
  if (!api) {
    throw new Error('Api not provided, please use ApiProvider');
  }
  return api as T;
};
