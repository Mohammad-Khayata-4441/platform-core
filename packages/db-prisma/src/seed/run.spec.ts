import { describe, it, expect } from 'vitest';
import { runSeed } from './run';

describe('runSeed', () => {
  it('invokes the callback once and returns its result', async () => {
    let calls = 0;
    const result = await runSeed(async () => {
      calls += 1;
      return 42;
    });
    expect(calls).toBe(1);
    expect(result).toBe(42);
  });
});
