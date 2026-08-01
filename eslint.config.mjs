import withNuxt from './.nuxt/eslint.config.mjs';
import eslintConfigPrettier from 'eslint-config-prettier';

export default withNuxt(
  eslintConfigPrettier,
  {
    name: 'app/general',
    files: ['**/*.{js,ts,vue,mjs}'],
    rules: {
      curly: ['error', 'all'],
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-constant-condition': 'error',
      'no-unused-expressions': ['error', { allowTernary: true, allowShortCircuit: true }],
      'no-warning-comments': [
        'error',
        { terms: ['todo', 'fixme'], location: 'anywhere', decoration: ['/', '*'] }
      ],
      'require-await': 'off',
      'sort-imports': ['error', { ignoreCase: true, ignoreDeclarationSort: true }]
    }
  },
  {
    name: 'app/vue',
    files: ['**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/html-self-closing': ['error', { html: { normal: 'always', void: 'always' } }],
      'vue/attribute-hyphenation': ['error', 'always'],
      'vue/component-name-in-template-casing': [
        'error',
        'kebab-case',
        { registeredComponentsOnly: true }
      ],
      'vue/require-explicit-emits': 'error',
      'vue/require-emit-validator': 'error',
      'vue/custom-event-name-casing': ['error', 'camelCase'],
      'vue/max-attributes-per-line': [2, { multiline: 1, singleline: 20 }],
      'vue/first-attribute-linebreak': ['error', { singleline: 'ignore', multiline: 'below' }],
      'vue/no-unused-properties': ['error', { groups: ['props'] }],
      'vue/no-useless-mustaches': [
        'error',
        { ignoreIncludesComment: false, ignoreStringEscape: false }
      ],
      'vue/no-useless-v-bind': [
        'error',
        { ignoreIncludesComment: false, ignoreStringEscape: false }
      ],
      'vue/component-api-style': ['error', ['script-setup']],
      'vue/block-order': ['error', { order: ['template', 'script', 'style'] }],
      'vue/block-tag-newline': 'error',
      'vue/enforce-style-attribute': ['error', { allow: ['scoped'] }],
      'vue/require-macro-variable-name': 'error',
      'vue/html-indent': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/require-default-prop': 'off'
    }
  },
  {
    name: 'app/typescript',
    files: ['**/*.ts', '**/*.vue'],
    rules: {
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: ['function', 'parameter'], format: ['camelCase'], leadingUnderscore: 'allow' },
        { selector: 'variable', format: ['camelCase', 'UPPER_CASE'], leadingUnderscore: 'allow' },
        { selector: 'typeLike', format: ['PascalCase'], leadingUnderscore: 'allow' }
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-empty-function': 'error',
      '@typescript-eslint/array-type': 'error',
      '@typescript-eslint/consistent-indexed-object-style': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_$', varsIgnorePattern: '^_$', caughtErrorsIgnorePattern: '^_$' }
      ],
      'no-unused-vars': 'off',
      'no-undef': 'off'
    }
  },
  {
    name: 'app/typescript-not-declarations',
    files: ['**/*.ts', '**/*.vue'],
    ignores: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': ['error', 'type']
    }
  },
  {
    name: 'app/scripts-and-e2e',
    files: ['scripts/**/*.{ts,js}', '**/*.play.ts'],
    rules: {
      'no-console': 'off'
    }
  }
);
