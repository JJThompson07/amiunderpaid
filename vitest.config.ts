import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    exclude: ['node_modules/**', 'e2e/**', 'tests/**'],
    alias: {
      '~': fileURLToPath(new URL('./app/', import.meta.url)),
      '~~': fileURLToPath(new URL('./', import.meta.url))
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'], // 'text' prints in terminal, 'html' gives you a visual dashboard
      include: [
        'shared/utils/**/*.ts',
        'app/composables/**/*.ts',
        'app/helpers/**/*.ts',
        'utils/**/*.ts',
        'server/**/*.ts'
      ],
      exclude: [
        'shared/utils/types.ts',
        'shared/utils/market-data.ts',
        'shared/utils/tests/**',
        'app/helpers/tests/**',
        'utils/tests/**',
        'utils/seedData.ts',
        // Static territory lookup-table data (~1,600/470 lines): every entry's
        // `TERRITORY_BAND_MAP[id] || DEFAULT` fallback compiles to its own
        // branch, and the fallback side is only reachable for an id that
        // doesn't exist in the map -- not a meaningful thing to unit test.
        'utils/locations/uk.ts',
        'utils/locations/usa.ts'
      ],
      thresholds: {
        perFile: true,
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80
      }
    }
  }
});
