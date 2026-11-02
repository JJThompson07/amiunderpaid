## 1. Pre-flight verification

- [x] 1.1 Confirm the live years per index before changing ranking: query Algolia with the read-only search key for `country × year` counts on both indices. Result 2026-11-02: only `year: 2025` present (UK national 500, UK regional 393, USA national 1,111, USA regional 36,920); no `customRanking` set.
- [x] 1.2 Confirm the cause of the empty summary panel: `firestore.rules` has no match for either benchmark collection (global deny), and `fetchSummary` swallows errors. Confirm `seed.post.ts`/`delete.post.ts` allow-lists omit both collections (`87f7e68`, 2026-08-17).
- [x] 1.3 Confirm every caller of `sync-algolia` (`seed.vue`, `coding-index.vue`) tolerates `customRanking: ['desc(year)']`.

## 2. Seeder summary

- [x] 2.1 Add `server/api/admin/benchmark-summary.get.ts`: `verifyAdmin`, then `count()` per national/regional collection × `UK`/`USA` × last five years × `period: 'year'` via `useAdminFirestore()`, returning only non-zero rows. Throw an opaque `500` on failure (§9.3).
- [x] 2.2 Unit test it in `server/api/admin/tests/benchmark-summary.spec.ts`: returns non-zero rows only, requires admin, and returns an opaque 500 on Firestore failure. ≥80% per-file coverage.
- [x] 2.3 Switch `seed.vue`'s `fetchSummary` to `adminFetch('/api/admin/benchmark-summary')`, log failures to the processing console, and drop now-unused client Firestore imports.

## 3. Seed and delete allow-lists

- [x] 3.1 Add `salary_benchmarks` and `regional_salary_benchmarks` to `ALLOWED_COLLECTIONS` in `seed.post.ts` and `delete.post.ts`.
- [x] 3.2 Add tests that both endpoints accept the benchmark collections and still reject an unlisted one (delete still requires filters).

## 4. Newest year wins

- [x] 4.1 Add `customRanking: ['desc(year)']` to `sync-algolia.post.ts`'s `setSettings`, and assert it in `sync-algolia.spec.ts`.
- [x] 4.2 In `useMicroData.ts` and `useMacroData.ts`, keep the first regional hit per location rather than the last, with a comment tying it to the ranking.
- [x] 4.3 Add tests to `useMicroData.spec.ts` and `useMacroData.spec.ts`: given two hits for the same region (2026 first, 2025 second), the map holds the 2026 values.

- [x] 4.4 Add `pinToSingleYear` to `shared/utils/benchmarkYear.ts` (unit-tested in `shared/utils/tests/benchmarkYear.spec.ts`) and apply it to the regional hits in `useMicroData`/`useMacroData`, pinned to the national hit's year, so a region missing from the newest release is dropped instead of showing an older year beside newer figures.
- [x] 4.5 Add composable tests for a region with only an older year and for regional uploads lagging the national upload.

## 5. Source spreadsheet labelling

- [x] 5.1 Correct the `parse.post.ts` header (ONS ASHE Table 14.7a / BLS OEWS national) and show the expected source per country/scope under the seeder's file picker.

## 6. Verification gate

- [x] 6.1 Run `pnpm test:verify` and confirm it passes in full.

## 7. Post-deploy (manual)

- [ ] 7.1 After deploy, open `/admin/seed` and confirm the panel lists the four 2025 datasets.
- [ ] 7.2 Upload UK 2026 national (ASHE 14.7a) and regional (ASHE 7.7a) back to back (regional data is hidden in between, by design), then check a UK search shows 2026 figures and the panel lists both years.
