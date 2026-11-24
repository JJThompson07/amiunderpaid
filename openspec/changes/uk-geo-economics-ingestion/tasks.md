## 1. Pre-flight (verify real state and sources)

- [ ] 1.1 Confirm `server-side-mca-engine` is merged: `server/utils/engine/baselines.ts` exists on the base branch. This change edits it.
- [ ] 1.2 Re-download ASHE Table 15 (newest release) and re-confirm what design D1 assumes: the `Full-Time` sheet; header columns `Description`, `Code`, `Median`, `Mean`, `10`, `25`, `75`, `90`; the `"<Region>, <Occupation>"` description; exactly the 11 GB region names. Record any difference in design.md before coding.
- [ ] 1.3 Confirm in Firestore (not just Algolia) that `salary_benchmarks` holds national UK 3-digit rows (e.g. `id_code == '243'`) for the newest year. Step 3 of the cascade depends on them; they're confirmed in Algolia for 2025/2026.
- [ ] 1.4 Choose the postcode lookup source for `scripts/build-uk-geo.ts`: the smallest OGL ONS Geoportal file mapping postcodes (or outcodes) to LAD. Confirm its licence terms allow redistributing derived outcode→LAD data in a public repo, and note the source URL and licence in the script header. If the licence doesn't allow it, stop and ask the user before continuing.
- [ ] 1.5 Fetch the CPIH JSON (`/economy/inflationandpriceindices/timeseries/l522/mm23/data`) and the current Price Index of Private Rents xlsx. Record the exact JSON path of the monthly series and the rents workbook's sheet name, header row and columns (GSS code, area, average rent, month). Then write the D4 parsers against those.
- [ ] 1.6 Confirm `CRON_SECRET` and `RESEND_API_KEY` exist in Vercel Production, by name only.

## 2. Location lookup

- [ ] 2.1 `scripts/build-uk-geo.ts`: download the lookups, build `regions`, `places` (every `ONS_LOCATIONS` entry, plus a manual override table for names that don't match) and `outcodes` (majority LAD). Write `shared/data/uk-geo.json` and fail if any `ONS_LOCATIONS` entry is unmatched. Run it with `pnpm dlx tsx scripts/build-uk-geo.ts`; no new dependency.
- [ ] 2.2 Commit the generated `shared/data/uk-geo.json`, and add it to `coverage.exclude` if Vitest tries to instrument it (it's static data, §8).
- [ ] 2.3 `shared/utils/ukGeo.ts`: the `GB_REGIONS` 11-entry name→GSS table, `resolveUkLocation(input)` per design D3, and a server-only header comment.
  - Tests: `shared/utils/tests/ukGeo.spec.ts`, covering a place name, a "UA" suffix, an outcode, a full postcode, lowercase/spacing variants, Northern Ireland, unknown input and every `GB_REGIONS` entry.

## 3. Table 15 seeding

- [ ] 3.1 `shared/utils/govSpreadsheet.ts`: add `scope: 'regional-occupation'` per design D1. Split region/occupation, set `soc_level`, add `geo_code` from `GB_REGIONS`, keep rows with a median or a mean, and throw on an unknown region.
  - Tests in `shared/utils/tests/govSpreadsheet.spec.ts` with a small fixture workbook built in the test: a mean-only row, a suppressed row, a 3-digit row, an unknown region and the apostrophe code.
- [ ] 3.2 `app/pages/admin/seed.vue`:
  - Add the scope option with expected-file text naming "ASHE Table 15.7a (4-digit and 3-digit SOC), Full-Time" (admin page, so a hardcoded string is fine).
  - Append the code to doc ids for this scope.
  - Skip the Algolia sync step for this scope.
  - Make delete-by-year for this scope filter `soc_level in [3, 4]`.
- [ ] 3.3 Seed 2026 Table 15 (4-digit and 3-digit) to **production** through the admin seeder. Afterwards verify the counts in Firestore: about 4,532 + 1,144 docs minus rows with neither a median nor a mean. Confirm the Table 7.7a records are unchanged (still 782 UK `title: 'All'` across years).

## 4. Engine cascade

- [ ] 4.1 `server/utils/engine/baselines.ts`: implement the UK regional micro cascade per design D2.
  - Resolve the request location with `resolveUkLocation`.
  - Query regional docs by `id_code` + `geo_code` and national 3/4-digit docs, all pinned to one year. Return `basis`.
  - Tests in `server/utils/engine/tests/baselines.spec.ts`: each of the 4 steps, a year mismatch between steps (falls through rather than mixing years), Northern Ireland and an unresolvable location.
- [ ] 4.2 Add `basis` to `EngineOutput` (`server/utils/engine/types.ts`) and to `/api/engine/benchmark`'s response. Update the endpoint test.

## 5. UI honesty for estimated figures (UK results page)

- [ ] 5.1 Pass `basis` through `useLocationEngine` (new return field `regionalBasis`) and update its spec.
- [ ] 5.2 Where the results page shows the regional figure (`app/components/Section/UKComparison.vue`, the regional block of the government comparison card), show an "Estimated from published regional data" note when `regionalBasis` is `regional-estimated` or `regional-parent`. Add i18n keys in both `i18n/locales/en-GB/*.json` and `en-US` (§6). USA pages are unaffected; the field is absent for USA.

## 6. Economics ingestion

- [ ] 6.1 `server/utils/economicsSync.ts`: `syncCpih()` and `syncRents()` per design D4, each validating shape before any write and recording redacted `lastError` on failure (§9.6).
  - Tests: `server/utils/tests/economicsSync.spec.ts`, with fixture JSON and a fixture workbook. Cover the happy path, a fetch 5xx, a 429 (treated as failure, nothing written), too few rows and a missing rents link on the dataset page.
- [ ] 6.2 `server/api/cron/sync-economics.get.ts`: timing-safe `CRON_SECRET` check (same helper pattern as `clean-cache.get.ts`), `Promise.allSettled` over both sources, and a Resend summary email.
  - Tests: `server/api/cron/tests/sync-economics.spec.ts`, covering 401, both succeed, one fails and the email-send failure not failing the run.
- [ ] 6.3 Add `{ "path": "/api/cron/sync-economics", "schedule": "0 5 20 * *" }` to `vercel.json`.
- [ ] 6.4 `firestore.rules`: add `uk_economic_indicators` and `uk_rents` as `allow read, write: if false` (server-only). Add a rules test case in the existing rules test suite.
- [ ] 6.5 `server/utils/economics.ts`: `getGeoEconomics(location)` per design D5, with the 6h bounded cache.
  - Tests: `server/utils/tests/economics.spec.ts`, covering LAD, CTYUA and region rent fallback, missing CPIH, an unresolvable location and cache behaviour.
- [ ] 6.6 `app/pages/admin/admin-actions.vue`: show each source's `updatedAt` / `lastError`, and add a "Run economics sync now" button through a new admin endpoint `server/api/admin/sync-economics.post.ts` (`verifyAdmin`, + test).
- [ ] 6.7 After deploy, trigger one sync from the admin page and verify `uk_economic_indicators/cpih.latest` matches the ONS figure. On 2026-11-10 the latest CPIH index was Sep 2026 = 144.0. Also verify the `uk_rents` doc count.

## 7. Verification

- [ ] 7.1 Locally against production data (read-only), check that a UK search for "software developer" in Manchester and in London now shows a regional figure with the right `basis`, and that a Belfast search shows national.
- [ ] 7.2 Gate: `pnpm test:verify` passes, including the 80% per-file coverage for `ukGeo.ts`, `economicsSync.ts`, `economics.ts`, `baselines.ts` and the cron and admin handlers.
