import withNuxt from './.nuxt/eslint.config.mjs';
import eslintConfigPrettier from 'eslint-config-prettier';

export default withNuxt(
  // 1. Add Prettier config to disable conflicting formatting rules
  eslintConfigPrettier,

  // 2. Add any custom rules here
  {
    rules: {
      'vue/multi-word-component-names': 'off', // Optional: allows single-word component names
      'no-console': 'warn',
      '@typescript-eslint/no-explicit-any': 'off'
    }
  }
);
