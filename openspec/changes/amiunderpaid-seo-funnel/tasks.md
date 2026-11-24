## 1. Pre-flight (verify real state)

- [ ] 1.1 Confirm `uk-geo-economics-ingestion`, `api-keys-metering-billing` (for `takeHomePay.ts`) and `recruiter-deprecation-and-regional-explorer` (for `/explorer`) are merged.
- [ ] 1.2 Re-check that ISR ignores query strings on `/salary/**` in production: fetch one page with two different `compare` values and confirm neither appears in the HTML and `x-vercel-cache` is `HIT` (the 2026-11-12 result). If the behaviour has changed, revisit design D3 before building.
- [ ] 1.3 Re-check the UKHPI file. Find the newest `UK-HPI-full-file-YYYY-MM.csv`, record its size and header, and confirm the `AreaCode` values are GSS codes that `shared/data/uk-geo.json` can join (LAD/CTYUA/region). Record the join coverage %.
- [ ] 1.4 Read `/v1/benchmark`'s `meta.sources` (from `api-keys-metering-billing`) so `/data-sources` uses the same dataset names and licence text.
- [ ] 1.5 Re-read the Vercel project's `defaultResourceConfig` and confirm `fluid: true` and `functionDefaultTimeout` ≥ 300 (the 2026-11-24 result), and time one full UKHPI download + streamed parse locally. If the timeout changed or the parse takes more than ~150s, add `maxDuration: 300` for `/api/cron/**` or revisit design D1 before building.

## 2. House prices

- [ ] 2.1 `server/utils/economicsSync.ts`: `syncHousePrices()` per design D1 (newest-file probe, streamed parse, header-name columns, validation, batch write).
  - Tests in `server/utils/tests/economicsSync.spec.ts` with a small fixture CSV stream: rows split across chunk boundaries (including mid-field and a CRLF split), a final line with no trailing newline, latest-per-area selection where string order and date order disagree (e.g. `15/01/2026` vs `01/08/2026`), reordered columns, a 404 then 200 probe, all-404 (no write, error recorded), too few areas, a stale latest month.
- [ ] 2.2 Add it to `server/api/cron/sync-economics.get.ts`'s `Promise.allSettled` set and summary email, and to the admin "run now" endpoint. Update both specs.
- [ ] 2.3 `firestore.rules`: `uk_house_prices` server-only, plus a rules test.
- [ ] 2.4 `server/utils/economics.ts`: add `housePrice` with the LAD → CTYUA → region fallback, and update `server/utils/tests/economics.spec.ts`.
- [ ] 2.5 `app/pages/admin/admin-actions.vue`: show house-price sync status next to CPIH and rents.

## 3. Engine economics block

- [ ] 3.1 `server/utils/engine/computeBenchmark.ts`: add the UK `economics` block per design D2, using `getGeoEconomics`, `calculateTakeHome` and the previous ASHE year's role median for `payChangeYoY`.
  - Tests: the block is present for UK + location; absent for USA and for no location; identical across different `salary` inputs; regional vs national pay selection by `basis`.
- [ ] 3.2 `server/api/engine/benchmark.get.ts`: include `economics`, and update the endpoint spec.

## 4. Living costs UI

- [ ] 4.1 `app/composables/useLivingCosts.ts` per design D3, with `localStorage` access in try/catch.
  - Tests: `app/composables/tests/useLivingCosts.spec.ts`, using `effectScope` per test (§8). Cover user take-home, rent share, ratios, no salary, Scotland, student loans and storage throwing.
- [ ] 4.2 Expose `economics` and `taxRegion` from `useLocationEngine`, and update its spec.
- [ ] 4.3 Components `app/components/Section/LivingCosts/{Section,TakeHome,RentBurden,HousePrice,Inflation}.vue`:
  - salary-dependent lines in `<ClientOnly>`
  - source line linking to `/data-sources#…`
  - estimated note when the pay basis isn't `regional`
  - expand/collapse (if any) uses the grid technique (§5)
- [ ] 4.4 Mount `SectionLivingCosts` in `app/pages/salary/[title]/[country]/[[location]].vue` per design D4.
- [ ] 4.5 i18n `living-costs.json` (en-GB and en-US), registered in both `index.ts`. All copy and the "estimated" note go through `$t` (§6).

## 5. Cross-brand CTAs and data sources

- [ ] 5.1 `app/components/AmI/BenchmarkMyRoleCta.vue` (`inline`/`panel`, `placement` prop, UTM link). It builds its own URL, which is real logic, so add a test at `app/components/AmI/tests/BenchmarkMyRoleCta.spec.ts` (§8).
- [ ] 5.2 Add the inline CTA to `app/components/AmI/NavBar.vue` (desktop and mobile, not for admins) and to the footer in `app/layouts/default.vue`.
- [ ] 5.3 Add the panel CTA to `app/pages/data-sources.vue`, `app/pages/mca-score.vue` and `app/pages/explorer.vue`.
- [ ] 5.4 Rewrite `app/pages/data-sources.vue`: one card per source (ONS ASHE 7.7a/14.7a/15, CPIH, Price Index of Private Rents, HM Land Registry UKHPI, live job providers), with anchors matching the living-costs source links and the OGL v3.0 attribution statement. Update `i18n/locales/*/data-sources.json` in both locales.
- [ ] 5.5 Add `navbar` and `common.footer` i18n keys for the CTA (both locales).

## 6. Tests and checks

- [ ] 6.1 e2e `e2e/living-costs.spec.ts` with **mocked** `/api/engine/benchmark` (an economics block included), cookie banner declined, GA/GTM blocked. Cover: a UK location page shows 4 cards; with `?compare=52000` and an Edinburgh location the take-home line appears after hydration; a USA page has no section.
- [ ] 6.2 e2e assertion (in `e2e/search.spec.ts` or the new spec) that no BenchmarkMyRole panel appears on a `/salary` page, while the footer link does.
- [ ] 6.3 After deploy, re-run the 1.2 check on a page with a location: the cached HTML contains the Living costs role-median figures and no `compare` value.
- [ ] 6.4 Gate: `pnpm test:verify` passes (lint incl. i18n, typecheck, 80% per-file coverage incl. `economicsSync.ts`, `economics.ts`, `computeBenchmark.ts`, `useLivingCosts.ts`; e2e with mocks; rules).
