import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    exclude: ['node_modules/**', 'e2e/**'],
    alias: {
      '~': fileURLToPath(new URL('./app/', import.meta.url)),
      '~~': fileURLToPath(new URL('./', import.meta.url))
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'], // 'text' prints in terminal, 'html' gives you a visual dashboard
      include: ['shared/utils/**/*.ts', 'app/composables/**/*.ts'],
      exclude: ['shared/utils/types.ts', 'shared/utils/tests/**'] // Ignore TypeScript definition files and tests
    }
  }
});
