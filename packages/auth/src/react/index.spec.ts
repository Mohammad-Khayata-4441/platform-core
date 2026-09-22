import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRefreshCoordinator } from './index';

describe('createRefreshCoordinator', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('collapses concurrent calls into a single underlying fetch, all resolving to the same result', async () => {
    let resolveFetch!: (value: Response) => void;
    (fetch as any).mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const refreshOnce = createRefreshCoordinator('/backend/merchant/auth/refresh');
    const calls = [refreshOnce(), refreshOnce(), refreshOnce(), refreshOnce(), refreshOnce()];

    resolveFetch(new Response(null, { status: 200 }));
    const results = await Promise.all(calls);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('/backend/merchant/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    expect(results).toEqual([true, true, true, true, true]);
  });

  it('triggers a new fetch after the in-flight one settles (no stale caching)', async () => {
    (fetch as any)
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));

    const refreshOnce = createRefreshCoordinator('/backend/auth/refresh');
    const first = await refreshOnce();
    const second = await refreshOnce();

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  it('resolves false (not a throw) when the request itself fails', async () => {
    (fetch as any).mockRejectedValue(new Error('network down'));
    const refreshOnce = createRefreshCoordinator('/backend/auth/refresh');
    await expect(refreshOnce()).resolves.toBe(false);
  });
});
