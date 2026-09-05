import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    // Tests live in tests/, so src/ is only what ships. Stated explicitly
    // rather than left to the default glob, which happily picked up strays.
    include: ['tests/**/*.test.{ts,tsx}'],
    // The measurement scripts are experiments that produce decisions, not tests
    // with assertions. Run them with `npm run bakeoff`, `npm run calibrate`, etc.
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', 'scripts/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'e2e/',
        '**/*.config.ts',
        '**/*.d.ts',
        '**/types/',
      ],
    },
  },
});
