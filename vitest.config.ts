import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    alias: {
      '~': fileURLToPath(new URL('./', import.meta.url))
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'], // 'text' prints in terminal, 'html' gives you a visual dashboard
      include: ['utils/engineScoring/**/*.ts'], // Only check our scoring engine
      exclude: ['utils/engineScoring/types.ts'] // Ignore TypeScript definition files
    }
  }
});
