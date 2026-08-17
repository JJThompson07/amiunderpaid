## 1. Firebase Rules Testing
- [ ] 1.1 Install `@firebase/rules-unit-testing`.
- [ ] 1.2 Write a comprehensive rules suite covering: owners editing profiles, owners unable to modify protected fields, admin capabilities, recruiter access to leads, and blocks on client writes to sensitive logs (`search_history`, `mail`). Ensure it runs against the emulator in CI.

## 2. Core Math Unit Testing
- [x] 2.1 In `shared/utils/tests/uk.spec.ts` (and USA equivalent), replace vague `toBeGreaterThan(0)` assertions with hand-computed exact assertions (`toBe(n)`).
- [x] 2.2 Write explicit tests for `calculateConfidenceScore` and `buildHistogramBuckets`, covering edge cases like `min === max` and negative salaries.
- [ ] 2.3 Remove the `v8 ignore start` block in `useLocationEngine.ts` and test it with injected `pageData` fixtures. Fix the dangling `v8 ignore start` block in `utils/locations/uk.ts`.

## 3. E2E & Server Coverage
- [x] 3.1 Refactor `e2e/api-fallback.spec.ts` to drive the real path using `devProvider` rather than completely mocking the endpoints. Assert on rendered provider attribution.
- [x] 3.2 Add an SSR Playwright project in `playwright.config.ts` targeting one `/salary/**` URL per tenant domain, asserting against the initial HTML response body instead of the hydrated DOM.
- [x] 3.3 Add `server/**` to `coverage.include` in `vitest.config.ts` and establish a starting threshold. Update documentation in `AGENTS.md` and `DEV.md` regarding server coverage requirements.
- [x] 3.4 Write unit tests for `server/middleware/admin-guard.ts`, the Stripe webhook transaction, and the rate limiter middleware based on the `search-logs.spec.ts` model.
