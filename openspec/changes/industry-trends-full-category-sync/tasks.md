## 1. Pre-flight verification

- [x] 1.1 Confirm `fetchCategoryLabels`'s `AdzunaCategoriesResponse` parsing (`results: [{tag, label}]`) in `server/utils/industryTrendsSync.ts` matches Adzuna's real response shape — already confirmed live in production via the 2026-10-02 manual admin-triggered sync (21 categories synced successfully using this exact parsing) and via `server/api/market-data/categories.ts`, which calls the same endpoint and is exercised by the live site. No new live Adzuna call is needed to re-verify this.
- [x] 1.2 Grep the repo for all callers of `extractActiveCategoryCountryPairs` and `fetchCategoryLabels` and confirm neither is used outside `server/utils/industryTrendsSync.ts` and its own `tests/` files, so changing their contracts and removing the former is safe.

## 2. Core sync logic

- [x] 2.1 In `server/utils/industryTrendsSync.ts`, remove the silent `catch { /* nice-to-have */ }` in `fetchCategoryLabels` so a categories-fetch failure (after `fetchWithRetry`'s existing retries are exhausted) propagates to the caller instead of silently returning an empty `Map`.
- [x] 2.2 Add a fixed `TRACKED_COUNTRIES = ['gb', 'us'] as const` constant. In `runIndustryTrendsSync`, replace the `extractActiveCategoryCountryPairs(cacheDocs)`-derived `pairs`/`countriesInUse` with: for each country in `TRACKED_COUNTRIES`, call `fetchCategoryLabels`; on success, build that country's pairs from the returned Map's tag keys; on failure (caught per-country), push one synthetic failed `SyncOutcome` (e.g. `{ categoryTag: 'categories-fetch', country, status: 'error', error: ... }`) into `results` and skip `/history` calls for that country this run, without aborting the other tracked country's sync.
- [x] 2.3 Remove the `extractActiveCategoryCountryPairs` import and all remaining references to it from `server/utils/industryTrendsSync.ts`. Keep the `adzuna_jobs_cache` read and `countCategoryLookups` call — they still drive `lookupCount`.
- [x] 2.4 Remove `extractActiveCategoryCountryPairs` and its now-unused `ActiveCategoryCountry` type from `server/utils/adzunaHistory.ts`.

## 3. Tests

- [x] 3.1 In `server/utils/tests/industryTrendsSync.spec.ts`, update every existing test's `/categories` mock response to return the `tag`/`label` pairs that test needs synced (sync scope no longer comes from the `adzuna_jobs_cache` mock), keeping the existing `adzuna_jobs_cache` mock only for `lookupCount` assertions. Run `pnpm vitest run server/utils/tests/industryTrendsSync.spec.ts` and confirm every existing test still passes against the new mock shape.
- [x] 3.2 Add a test asserting a category with zero `adzuna_jobs_cache` docs is still synced because it's present in the `/categories` mock response — the core regression test for the production staleness bug this change fixes.
- [x] 3.3 Add a test asserting both `gb` and `us` are always attempted every run, independent of which countries (if any) appear in `adzuna_jobs_cache`.
- [x] 3.4 Add a test asserting that when one tracked country's `/categories` call fails (after `fetchWithRetry`'s retries are exhausted), the sync records an explicit failure for that country in `SyncSummary.results`/`failed` rather than silently treating it as zero categories to sync, and that the other tracked country still syncs successfully in the same run.
- [x] 3.5 In `server/utils/tests/adzunaHistory.spec.ts`, remove the `extractActiveCategoryCountryPairs` describe block and its now-unused import.

## 4. Verification gate

- [x] 4.1 Run `pnpm test:verify` and confirm it passes in full (lint, typecheck, Prettier, structure-lint, check-standards, unit tests with 80% per-file coverage, Playwright e2e, Firestore rules tests).
