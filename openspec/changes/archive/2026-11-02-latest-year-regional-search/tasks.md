## 1. Pre-flight verification

- [x] 1.1 Confirm the live record counts: 108,109 / 100,000 before the stop-gap; `regional_salary_benchmarks` held both 2025 and 2026 for UK and USA.
- [x] 1.2 Stop-gap (Algolia only, Firestore untouched): `deleteBy` `country:USA AND year:2025` on `regional_salary_benchmarks`. Verified 71,578 records total, USA 2026 regional intact (54 areas), USA 2025 regional gone from search.
- [x] 1.3 Confirm `year` is numeric on seeded records and declared in the index's `attributesForFaceting`, so `year < Y` works as a `deleteBy` filter.

## 2. Implementation

- [x] 2.1 Add `isLatestYear(year, existingYears)` to `shared/utils/benchmarkYear.ts`, with unit tests (newest, equal, older, empty list).
- [x] 2.2 In `app/pages/admin/seed.vue`, for regional uploads: skip the search sync when the year is older than the newest Firestore regional year for that country (log why); otherwise sync, then prune older years from search via `/api/admin/clear-algolia`, logging a warning (not failing) if the prune errors. National uploads are unchanged.
- [x] 2.3 Deleting the newest regional year logs that search has no regional data for that country until a year is synced again.
- [x] 2.4 Add a `clear-algolia` endpoint test showing a numeric range filter is passed through to `deleteBy` unchanged.
- [x] 2.5 Admin-page strings stay hardcoded (CODE_STANDARDS.md §6 exempts `pages/admin/`). No i18n task is needed.
- [x] 2.6 Run `pnpm test:verify` and confirm it passes in full.

## 3. Post-deploy (manual)

- [ ] 3.1 Remove UK 2025 regional from search with the same Algolia-only filter (`country:UK AND year:2025`), or let the next UK regional upload prune it.
