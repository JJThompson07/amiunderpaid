## Why

The admin Government Data Seeder (`app/pages/admin/seed.vue`) has been unable to load, delete, or upload government salary benchmarks since the Phase 1 security remediation (`87f7e68`, 2026-08-17). That change tightened access in three places and none of them covers the two benchmark collections:

1. `firestore.rules` has no match for `salary_benchmarks` or `regional_salary_benchmarks`, so they fall to the global deny. The seeder's "Current Database Records" panel runs client-side `getCountFromServer` queries against both, and `fetchSummary` swallows the permission error in an empty `catch`. The panel silently renders nothing, even though production holds 2025 data (verified live against Algolia on 2026-11-02: UK national 500, UK regional 393, USA national 1,111, USA regional 36,920 records, all `year: 2025`).
2. `server/api/admin/seed.post.ts`'s `ALLOWED_COLLECTIONS` omits both collections, so the seeder's upload fails with `400 Invalid seed target` before it reaches Algolia.
3. `server/api/admin/delete.post.ts`'s `ALLOWED_COLLECTIONS` contains only the two job caches, so the panel's per-dataset delete fails with `400`.

Separately, the 2026 UK ASHE release is ready to upload, but the read side cannot cope with more than one year per index. Seeded document and Algolia IDs include the year, so a new year is added next to the old one. No query in `useMicroData`/`useMacroData`/`useMarketData` filters by year, and the indices have no `customRanking`, so:

- national lookups take `hits[0]`, which is whichever year Algolia happens to rank first;
- regional lookups loop every hit keyed by location, so the last-seen year per region overwrites the others.

Users would get a nondeterministic mix of 2025 and 2026 figures.

## What Changes

- Add `GET /api/admin/benchmark-summary`, which counts records per collection/country/year/period with `firebase-admin` (bypassing client rules, like every other seeder write). `seed.vue`'s `fetchSummary` calls it through `useAdminFetch` and logs a failure to the processing console instead of swallowing it.
- Add `salary_benchmarks` and `regional_salary_benchmarks` to the `ALLOWED_COLLECTIONS` lists in `seed.post.ts` and `delete.post.ts`. `firestore.rules` is deliberately left unchanged: the benchmarks stay server-only.
- Add `customRanking: ['desc(year)']` to the index settings `sync-algolia.post.ts` applies before each upsert, so the newest year ranks first wherever text relevance ties.
- In `useMicroData` and `useMacroData`, keep the first hit per region in the regional loop instead of the last. With newest-first ranking, that makes the newest year win per region.
- Pin regional hits to the national record's year (`pinToSingleYear`, `shared/utils/benchmarkYear.ts`), so a single search never shows figures from different years. A region missing from the newest release shows no regional figure rather than last year's.
- (Already on the working tree) Correct the stale `parse.post.ts` header to name ONS ASHE Table 14.7a and the BLS OEWS national file, and show the expected source spreadsheet on the seeder.

## Non-goals

- Deleting 2025 data. It stays in place as a fallback once 2026 is uploaded.
- Moving the seeder's very large USA regional upload (~37k records in one request body) to a chunked flow. UK national/regional, the immediate need, are small.
- Opening `firestore.rules` to client reads of the benchmark collections.

## Capabilities

### New Capabilities

- `government-data-seeder`: admin seeder can list, upload and delete government benchmark datasets.

### Modified Capabilities

- `regional-benchmark-data`: adds a requirement that the newest data year wins when several years are indexed.

## Impact

- New: `server/api/admin/benchmark-summary.get.ts` and its test.
- `server/api/admin/seed.post.ts`, `server/api/admin/delete.post.ts`, `server/api/admin/sync-algolia.post.ts` and their tests.
- `app/composables/useMicroData.ts`, `app/composables/useMacroData.ts` and their tests.
- `app/pages/admin/seed.vue` (admin-only; hardcoded strings permitted per CODE_STANDARDS.md §6).
- Rollout order matters: deploy before uploading 2026, so the client-side first-wins change is live before a second year enters the index. The ranking setting applies itself on the first sync after deploy, because `sync-algolia` sets index settings before saving objects.
