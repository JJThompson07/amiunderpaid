## 1. Pre-flight (verify real state before touching provider behaviour)

- [ ] 1.1 Confirm `server-side-mca-engine` and `uk-geo-economics-ingestion` are merged: `server/utils/engine/computeBenchmark.ts` and `shared/utils/ukGeo.ts` exist.
- [ ] 1.2 Measure today's Reed calls per cold UK results page.
  - Add a temporary local-only counter around the Reed `$fetch` in `server/utils/reed.ts`, gated by `process.dev`, with a real key locally.
  - Load one never-searched title + location once. Record the call count (expected 4), then remove the counter.
  - Spend no more than 2 searches (≤ 8 calls) on this.
- [ ] 1.3 Ask the user to confirm the Reed quota figures in the Reed developer account: 1,000/day and 30,000/month, as given on 2026-11-10. Also check whether Reed's day boundary is UTC. If it isn't, set the day-key timezone in D3 to match before implementing.
- [ ] 1.4 Count UK `search_history` docs in the last 30 days and the number of distinct (title, location, schedule, contract) keys. That tells you how much of the demand the 150-search nightly budget covers; record it in design.md D5.

## 2. Single-flight and percentiles

- [ ] 2.1 `server/utils/singleFlight.ts` (+ `server/utils/tests/singleFlight.spec.ts`): shared promise, cleanup on resolve and on reject, separate keys independent.
- [ ] 2.2 Wrap the provider fetch in `server/api/market-data/jobs.ts` and `server/api/market-data/salary.ts` with `singleFlight(<harmonised cache key>, …)`. Add a test to each handler's spec where concurrent jobs + salary calls produce one `fetchReedData` invocation.
- [ ] 2.3 `server/utils/jobTiering.ts`: add `percentiles` (null below 5) and `sampleSize` per design D2. Extend the types in `shared/utils/market-data.ts`. Tests in `server/utils/tests/jobTiering.spec.ts`: interpolation, below-5 and an empty sample.
- [ ] 2.4 Persist `percentiles` and `sampleSize` in the `adzuna_jobs_cache` and `adzuna_distribution_cache` writes, and read them back, with legacy docs giving null. Update both handler specs.

## 3. Quota guard

- [ ] 3.1 Add non-secret server config to `nuxt.config.ts` `runtimeConfig`: `reedDailyCallCap`, `reedMonthlyCallCap`, `reedCallReserve` and `reedPrewarmCallBudget`, with design D3 defaults overridable by `NUXT_*` env.
- [ ] 3.2 `server/utils/providerQuota.ts`: `reserveReedCalls(n)` and `getReedUsage()` per design D3, skipped under `process.dev` / E2E.
  - Tests: `server/utils/tests/providerQuota.spec.ts`, covering under cap, daily refusal, monthly refusal, a day rollover key, a transaction error (fail-closed: refuse and log) and the dev bypass.
- [ ] 3.3 Call the guard before Reed in `jobs.ts` and `salary.ts`. On refusal, serve the newest cached doc with `stale: true` without touching `expiresAt`; else use the existing UK fallback. Add tests to both handler specs for refusal-with-cache and refusal-without-cache.
- [ ] 3.4 `firestore.rules`: `provider_usage` server-only (`allow read, write: if false`), plus a rules test.

## 4. Live geo cascade

- [ ] 4.1 `server/utils/liveCascade.ts` per design D4 (cache reads only, `MIN_LIVE_SAMPLE = 10`). Export the harmonised key builder from one place so jobs, salary and the cascade can't diverge.
  - Tests: `server/utils/tests/liveCascade.spec.ts`. Cover exact sufficient, regional cache, national scaled (check p-values, mean and histogram scaling), nothing wider and Northern Ireland (region lookup still works). Assert no provider fetch is ever called.
- [ ] 4.2 Use the cascade in `server/utils/engine/computeBenchmark.ts` for UK + location. Add `basis`, `sampleSize`, `percentiles` and `stale` to the engine `live` output and `/api/engine/benchmark`, and update their specs.

## 5. Pre-warm

- [ ] 5.1 Extract the provider-fetch + cache-write path of `salary.ts` into `refreshLiveEntry(args)` (in `server/utils/prewarm.ts` or a sibling util) and make `salary.ts` use it, with behaviour unchanged and existing tests green.
- [ ] 5.2 `server/utils/prewarm.ts`: `rankDemand` and `prewarm(budget)` per design D5, including the 240s self-stop.
  - Tests: `server/utils/tests/prewarm.spec.ts`. Cover ranking, normalisation defaults, skipping fresh entries, stopping on budget, stopping on quota refusal and a provider error on one key not aborting the run.
- [ ] 5.3 `server/api/cron/prewarm-live.get.ts`: timing-safe `CRON_SECRET`, run `prewarm(config.reedPrewarmCallBudget)`, Resend summary.
  - Tests: `server/api/cron/tests/prewarm-live.spec.ts`, covering 401, success summary and an email failure not failing the run.
- [ ] 5.4 `vercel.json`: add `{ "path": "/api/cron/prewarm-live", "schedule": "0 2 * * *" }`.

## 6. Consumer UI

- [ ] 6.1 `useLocationEngine`: expose `livePercentiles`, `liveSampleSize`, `liveBasis` and `liveStale` (update the spec).
- [ ] 6.2 Results page live section (`app/components/Section/Adzuna/Comparison.vue`, which renders the live tier for both countries; `Section/Reed/` holds only listings):
  - Show the sample size, plus "Based on wider-area listings" when `liveBasis !== 'exact'`.
  - Show the p25–p75 range when percentiles exist.
  - i18n keys in both locales (§6). USA shows the sample size and range only; there's no cascade.

## 7. Verification

- [ ] 7.1 Repeat the task 1.2 measurement on one new never-searched title: expect 2 Reed calls. Then remove the counter.
- [ ] 7.2 After deploy, read `provider_usage/reed-day-*` for the first two days and confirm the pre-warm summary emails arrived with sensible numbers. Report both to the user.
- [ ] 7.3 Gate: `pnpm test:verify` passes, with 80% per-file coverage on every new `server/utils/*.ts` and the cron handler.
