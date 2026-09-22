import { describe, it, expect } from 'vitest';
import { ApiClient } from '../infra/client';
import { ItemsClient } from './items.client';

describe('ItemsClient', () => {
  it('exposes the items resource routes', () => {
    const client = new ItemsClient(new ApiClient('http://localhost'));
    expect(client.key).toBe('items');
  });
});
