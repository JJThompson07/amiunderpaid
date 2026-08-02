## 1. Setup E2E Framework

- [x] 1.1 Install `@playwright/test` as a dev dependency.
- [x] 1.2 Create `playwright.config.ts` configured for standard modern browsers (Chromium, Firefox, WebKit) and set up the local dev server command.
- [x] 1.3 Add `test:e2e` to `package.json` scripts.

## 2. Implement E2E Tests

- [x] 2.1 Create `e2e/login.spec.ts` for testing user authentication and logout flows.
- [x] 2.2 Create `e2e/search.spec.ts` for testing the Algolia search autocomplete and results page.
- [x] 2.3 Create `e2e/checkout.spec.ts` for testing the Stripe checkout redirect flow (mocked if necessary).

## 3. Backfill Legacy Unit Tests

- [x] 3.1 Audit `~/utils/` for missing coverage and write Vitest suites in `shared/utils/tests/` or equivalent.
- [x] 3.2 Audit `~/composables/` for missing coverage and write Vitest suites in `app/composables/tests/`.

## 4. Enforce Tests in Guidelines

- [x] 4.1 Update `AGENTS.md` to explicitly state that autonomous agents MUST run `pnpm test` and `pnpm test:e2e` before concluding tasks, and any failed test blocks further execution.

## 5. Verification

- [x] 5.1 Run `pnpm test` (Vitest) to verify all unit tests pass.
- [x] 5.2 Run `pnpm test:e2e` to verify Playwright E2E tests run successfully.
- [x] 5.3 Run `pnpm format && pnpm lint && pnpm typecheck` as the final gate check to ensure the repo is completely bulletproof.
