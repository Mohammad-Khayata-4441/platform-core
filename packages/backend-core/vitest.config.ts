import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Vite 8 transforms with oxc, which respects tsconfig include/exclude. Our
  // tsconfig excludes `*.spec.ts`, so legacy `experimentalDecorators` must be
  // enabled explicitly for the test transform.
  oxc: {
    decorator: {
      legacy: true,
      emitDecoratorMetadata: true,
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
  },
});
