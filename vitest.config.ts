import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // The bake-off is an experiment that produces a decision, not a test with
    // assertions. Run it with `npm run bakeoff`.
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', 'scripts/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        'e2e/',
        '**/*.config.ts',
        '**/*.d.ts',
        '**/types/',
      ],
    },
  },
});
