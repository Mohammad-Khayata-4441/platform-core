import { vi } from 'vitest';

// The ported backend-core specs were written against Jest's `jest.*` API.
// Vitest exposes the same surface as `vi`, so alias it for compatibility.
(globalThis as unknown as { jest: typeof vi }).jest = vi;
