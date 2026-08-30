import { defineConfig } from 'vitest/config';

/**
 * The bake-off is an experiment, not a test: it runs to produce the data the
 * generation-strategy decision is made from, and takes minutes rather than
 * milliseconds. It gets its own config so `npm test` never picks it up.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['scripts/**/*.test.ts'],
    testTimeout: 1000 * 60 * 30,
  },
});
