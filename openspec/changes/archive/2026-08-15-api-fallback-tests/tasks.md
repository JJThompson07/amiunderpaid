## 1. Unit Tests

- [x] 1.1 Create or update unit tests for `server/api/adzuna/jobs.ts` in `server/api/adzuna/tests/jobs.spec.ts`. Mock `$fetch` to return a 429 Too Many Requests error and verify that `fetchReedData` is subsequently called and its payload is returned matching the frontend schema (with `provider: 'reed'`).
- [x] 1.2 Create or update unit tests for `server/api/adzuna/salary.ts` in `server/api/adzuna/tests/salary.spec.ts` similarly mocking the 429 to verify the fallback logic triggers and formats Reed data correctly.

## 2. Playwright E2E Tests

- [x] 2.1 Create a new Playwright e2e test (e.g. `tests/e2e/api-fallback.spec.ts`) that navigates to the home page, configures `devProviderOverride` to `reed` (or intercepts the API call via `page.route` returning 429), runs a search, and asserts the UI renders Reed results seamlessly.

## 3. Verification

- [x] 3.1 Run local verification `pnpm vitest run` to ensure unit tests pass.
- [x] 3.2 Run local verification `pnpm test:e2e` to ensure the new Playwright test passes successfully.
