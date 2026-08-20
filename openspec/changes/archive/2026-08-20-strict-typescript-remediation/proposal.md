## Why

The codebase has accumulated over 800 legacy ESLint and TypeScript violations—specifically revolving around `no-explicit-any`, missing function return types, and missing Vue emit validators. Because the repository's CI strictly enforces `eslint --max-warnings 0`, the lint pipeline currently fails. Fixing these errors is critical for achieving a robust, flawlessly typed, and maintainable application architecture in Phase 5.

## What Changes

- Resolve all `@typescript-eslint/no-explicit-any` warnings by providing explicit TypeScript interfaces and types across the codebase.
- Enforce `@typescript-eslint/explicit-function-return-type` on all server API endpoints, composables, and utilities.
- Add validator configurations for `defineEmits` array syntax to resolve `vue/require-emit-validator` in Vue components.
- Resolve other miscellaneous linting errors (e.g. `vue/no-unused-properties`, `vue/max-attributes-per-line`, `@typescript-eslint/no-unused-vars`).
- The end goal is that running `pnpm lint` yields an exit code of `0` with 0 errors and 0 warnings, without disabling any strict typing rules.

## Capabilities

### New Capabilities

- `eslint-strict-remediation`: Comprehensive resolution of all ESLint and TypeScript errors to ensure a clean codebase pipeline.

### Modified Capabilities

## Impact

- **Affected Code:** This is a broad but shallow refactoring task touching dozens of files across `server/`, `app/components/`, `app/composables/`, and `shared/utils/`.
- **APIs:** No functional API behavioral changes; just stricter parameter and return typings.
- **Dependencies:** None.
