import { describe, it, expect } from 'vitest';
import { extractSubdomain } from './subdomain';

describe('extractSubdomain', () => {
  it('returns the subdomain for a nested host', () => {
    expect(extractSubdomain('shop.example.com', 'example.com')).toBe('shop');
  });

  it('returns an empty string for the apex host', () => {
    expect(extractSubdomain('example.com', 'example.com')).toBe('');
  });

  it('strips the port', () => {
    expect(extractSubdomain('shop.example.com:3000', 'example.com')).toBe('shop');
  });
});
