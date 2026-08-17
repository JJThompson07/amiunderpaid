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
      include: ['shared/utils/**/*.ts', 'app/composables/**/*.ts', 'app/helpers/**/*.ts', 'utils/**/*.ts', 'server/**/*.ts'],
      exclude: ['shared/utils/types.ts', 'shared/utils/market-data.ts', 'shared/utils/tests/**', 'app/helpers/tests/**', 'utils/tests/**', 'utils/seedData.ts'],
      thresholds: {
        perFile: true,
        '*': {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80
        },
        'server/**/*.ts': {
          statements: 0,
          branches: 0,
          functions: 0,
          lines: 0
        }
      }
    }
  }
});
