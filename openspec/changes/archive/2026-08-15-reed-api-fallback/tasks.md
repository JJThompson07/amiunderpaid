## 1. Utilities

- [x] 1.1 Create `server/utils/reed.ts` with logic to fetch from Reed.co.uk API, compute mean salary, and generate histogram buckets.
- [x] 1.2 Update `server/constants/locations.ts` to include `REED_LOCATION_MAP` that maps our internal URL slugs to Reed's regional strings.
- [x] 1.3 Write unit tests in `server/utils/tests/reed.spec.ts` for the Reed utility functions.

## 2. API Integration

- [x] 2.1 Update `server/api/adzuna/salary.ts` to catch rate limit errors from Adzuna and return the fallback response from the Reed utility.
- [x] 2.2 Update `server/api/adzuna/jobs.ts` to catch rate limit errors from Adzuna and return the fallback response from the Reed utility.

## 3. Frontend Updates

- [x] 3.1 Update `app/composables/useAdzuna.ts` to expose the data provider (Adzuna or Reed) from the API responses.
- [x] 3.2 Create a new component `app/components/Section/Reed/JobListing.vue` for displaying Reed job entries.
- [x] 3.3 Update the main job list container (e.g. `app/components/Section/Adzuna/Comparison.vue` or similar) to conditionally render the section title ("Jobs by adzuna" vs "Jobs By Reed" with links) and render the appropriate job listing component.
- [x] 3.4 Update `i18n/locales/en-GB/data-sources.json` (and US equivalent) to rename the "Adzuna Intelligence" tile to "Adzuna & Reed Intelligence" and update the description to mention both providers. Do not remove the "Crowdsourced" tile.

## 4. Admin Tracking & Cache Migration

- [x] 4.1 Write a one-off backfill script (e.g. `scripts/backfill-adzuna-provider.ts`) to update existing cache records in Firestore (collections `adzuna_distribution_cache` and `adzuna_jobs_cache`) by adding `provider: 'adzuna'` to the `data` object for all existing records.
- [x] 4.2 Update `app/pages/benchmark/[title]/[country]/[[location]].vue` (and similar paths) or the relevant search composable to include the `provider` field when saving search log metrics to Firestore.
- [x] 4.3 Update `app/pages/admin/search-logs.vue` (or equivalent component) to display the Provider column in the admin table.

## 5. Verification

- [x] 5.1 Run `pnpm vitest run` to ensure all tests pass and unit tests accurately cover the new Reed logic.
- [x] 5.2 Run `pnpm nuxi typecheck` to catch any typing issues.
