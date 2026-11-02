## Why

The admin seeder cannot upload the BLS OEWS state/area file. Vercel caps function request bodies at 4.5 MB, and on 2026-11-02 the May 2025 USA regional upload failed at its first step with `413` on `POST /api/admin/parse-region`.

Even past the upload, every later step sends the whole dataset in one request:

- the parsed response (~36k records, roughly 11 MB of JSON);
- the `/api/admin/seed` body;
- the `/api/admin/sync-algolia` body.

USA production is currently half-updated. National 2026 is live (1,129 records), but regional is still only 2025, so the one-year-per-result rule hides USA regional figures until regional 2026 can be uploaded.

## What Changes

- **Parse in the browser.** Move the ONS/BLS spreadsheet parsing out of `server/api/admin/parse.post.ts` and `parse-region.post.ts` into one pure module, `shared/utils/govSpreadsheet.ts`. The two near-duplicate parsers become one function taking `{ country, scope, year }`. The seeder reads the file with `xlsx` in the browser (dynamically imported, so it stays out of every other bundle) and calls that function, so the spreadsheet never crosses the network. Both parse endpoints and their tests are removed; the tests are ported to the shared module.
- **Send records in chunks.**
  - `useAdminClient.batchSeed` sends records to `/api/admin/seed` in fixed-size chunks and logs progress.
  - A new `useAdminClient.batchSyncSearch` does the same for `/api/admin/sync-algolia`.
  - A failed chunk stops the run, reports how many records were written, and rethrows. Document and object IDs are deterministic, so pressing Sync again safely re-writes everything.
- **Clearer progress in the seeder's console.**
  - A live progress bar per step, plus a single progress line that updates in place rather than one line per chunk.
  - A parse summary: record count, occupations × locations, and rows skipped for suppressed or missing medians.
  - A duration for each step.
- **Pin the parsed scope.** Sync writes to the collection the file was parsed for, not whatever the National/Regional toggle shows when Sync is clicked. Previously, toggling between Parse and Sync sent the rows to the wrong collection.
- No server endpoint changes beyond deleting the two parse routes. The seed and sync-algolia contracts stay the same; they just receive smaller bodies.

## Non-goals

- Chunking `/api/admin/delete`. It already takes only filters, not records.
- Changing `coding-index.vue`'s own upload flow.
- Any change to how the public site reads benchmarks.

## Capabilities

### Modified Capabilities

- `government-data-seeder`: uploads of any size within the browser's limits succeed, and a partial failure is reported and retryable.

## Impact

- New: `shared/utils/govSpreadsheet.ts` and `shared/utils/tests/govSpreadsheet.spec.ts`.
- Removed: `server/api/admin/parse.post.ts`, `server/api/admin/parse-region.post.ts` and their specs (their only caller is `seed.vue`).
- `app/composables/useAdminClient.ts`, `app/composables/useConsoleLog.ts` (+ specs), `app/pages/admin/seed.vue`. `coding-index.vue` also uses `batchSeed`; it picks up chunking and the new log lines with no code change.
- Firestore: a USA regional upload is ~36k document writes, the same volume as the 2025 upload. Algolia: ~36k more records in `regional_salary_benchmarks`.
