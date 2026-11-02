## 1. Pre-flight verification

- [x] 1.1 Confirm the failure point and limit: the USA regional upload on 2026-11-02 failed with `413` on `POST /api/admin/parse-region`, the file-upload step, before anything was written. Vercel's request-body cap is 4.5 MB.
- [x] 1.2 Confirm `xlsx` can run in the browser: `vendor/xlsx-0.20.3.tgz` ships `package/xlsx.mjs` (ESM).
- [x] 1.3 Confirm `parse.post.ts` and `parse-region.post.ts` have no callers other than `app/pages/admin/seed.vue`, and diff their USA branches (identical) and UK branches (differ only in how `Description` maps to title vs location).

## 2. Shared parser

- [x] 2.1 Add `shared/utils/govSpreadsheet.ts` with `parseGovernmentWorkbook(workbook, { country, scope, year })`. It ports both endpoints' logic unchanged in behaviour (sheet selection, header detection, value cleaning, percentiles) and throws `Error` with the existing messages on structural failures.
- [x] 2.2 Port the 23 cases from `server/api/admin/tests/parse.spec.ts` and `parse-region.spec.ts` to `shared/utils/tests/govSpreadsheet.spec.ts`; ≥80% per-file coverage.
- [x] 2.3 Delete `server/api/admin/parse.post.ts`, `parse-region.post.ts` and their specs.

## 3. Chunked writes

- [x] 3.1 `useAdminClient.batchSeed`: send to `/api/admin/seed` in chunks of 1,000 with progress logs. On a failed chunk, log the written count and rethrow.
- [x] 3.2 Add `useAdminClient.batchSyncSearch(data, indexName)`, chunked the same way, for `/api/admin/sync-algolia`.
- [x] 3.3 Tests in `useAdminClient.spec.ts`: multi-chunk split (e.g. 2,500 → 1,000/1,000/500), stop-on-failure with the written count, and the existing empty/error behaviour.

## 4. Seeder

- [x] 4.1 `seed.vue` `handleParse`: dynamic-import `xlsx` and `govSpreadsheet`, read the selected file in the browser, and log parse errors without any network call.
- [x] 4.2 `seed.vue` `seedToFirestore`: use `batchSeed` + `batchSyncSearch`. Keep the existing retry messaging and hold `loading` until both finish.
- [x] 4.3 Console: add `useConsoleLog.logProgress` (rewrites its own previous line), a `useAdminClient.progress` state rendered as a progress bar, a parse summary (records, occupations × locations, skipped rows) and per-step durations. Tests in `useConsoleLog.spec.ts` / `useAdminClient.spec.ts`.
- [x] 4.4 Pin the parsed scope (`parsedScope`) so Sync targets the collection the file was parsed for.

## 5. PR review follow-ups

- [x] 5.1 `useAdminFetch`: use the cached ID token instead of forcing a refresh per request. On a `403`, force one refresh and retry, preserving newly granted admin claims. With tests.
- [x] 5.2 `sync-algolia`: optional `configureSettings` (default `true`). `batchSyncSearch` applies settings on the first chunk only. With tests.
- [x] 5.3 `useAdminClient`: `batchSeed`/`batchSyncSearch` only clear `loading` if they set it. `seed.vue` and `coding-index.vue` hold it across their whole sync flow. `coding-index.vue` also moves to the chunked `batchSyncSearch`.
- [x] 5.4 `seed.vue`:
  - `shallowRef` for `parsedData`;
  - yield a frame before the synchronous parse;
  - reset the file input so the same file can be re-selected;
  - discard parsed data when country, year or scope changes;
  - skip the Firestore step on a retry after a search-only failure;
  - consistent `formatCount` formatting.
- [x] 5.5 `govSpreadsheet`: read with `cellFormula`/`cellHTML`/`cellText` off, and treat whitespace-only code cells as no code.

## 6. Verification gate

- [x] 6.1 Run `pnpm test:verify` and confirm it passes in full.

## 7. Post-deploy (manual)

- [ ] 7.1 Upload the USA May 2025 OEWS state/area file as regional 2026, check the panel shows USA 2026 Regional (~36k), and check a USA search shows regional figures again.
