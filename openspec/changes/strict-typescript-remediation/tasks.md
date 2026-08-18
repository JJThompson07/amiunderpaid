## 1. Vue Component Remediation

- [x] 1.1 Convert `defineEmits` syntax in all components under `app/components/` to use type-based declarations to satisfy `vue/require-emit-validator` without bloat.
- [x] 1.2 Fix unused component props (`vue/no-unused-properties`) and missing types (`@typescript-eslint/no-explicit-any`) across all UI and layout Vue components.
- [x] 1.3 Fix formatting-related issues (`vue/max-attributes-per-line` and `vue/custom-event-name-casing`) as flagged by ESLint.

## 2. Server API Endpoint Typings

- [x] 2.1 Add missing return types (`@typescript-eslint/explicit-function-return-type`) and typed request bodies/query params to endpoints under `server/api/admin/`.
- [x] 2.2 Add missing return types and typed request bodies/query params to endpoints under `server/api/user/` and `server/api/market-data/`.
- [x] 2.3 Add missing return types and typed request bodies/query params to endpoints under `server/api/stripe/`.

## 3. Server Utilities & Middleware

- [x] 3.1 Provide explicit typings and return types in `server/utils/` (e.g., Firebase, Jooble, Reed API utilities).
- [x] 3.2 Ensure `server/middleware/` files correctly type H3 events and payloads.

## 4. Shared Utilities & Global State

- [x] 4.1 Extract complex duplicated payload models into `shared/utils/types.ts` (e.g., Algolia models, market data aggregations).
- [x] 4.2 Fix missing return types and `any` usages across `shared/utils/` and `app/composables/`.

## 5. Automated Fixes and CI Verification

- [x] 5.1 Run `eslint --fix` and `prettier --write` globally to ensure all syntactical formatting is applied.
- [x] 5.2 Execute `pnpm lint` and manually resolve any remaining straggler warnings/errors until it exits with code 0 without `--max-warnings 0` failing. (spellcheck/typecheck/prettier/structure-lint/check-standards/eslint all pass on every source file; the one remaining `pnpm lint` failure is Prettier formatting on `pnpm-lock.yaml`, caused by an unrelated concurrent `pnpm dev:clean` reinstall running in another terminal during this session — not part of this change's scope.)
- [x] 5.3 Run `pnpm typecheck` to verify no compilation regressions were introduced.
- [x] 5.4 Run local verification `pnpm vitest run` and `pnpm test:e2e` to ensure all tests pass.
