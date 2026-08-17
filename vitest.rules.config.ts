import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config.ts';

// Create a copy of the config and override exclude
const config = { ...baseConfig };
if (config.test) {
  config.test.exclude = ['node_modules/**', 'e2e/**'];
}

export default config;
