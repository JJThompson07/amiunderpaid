## Why

Reed is the UK live-market provider. The account allows 1,000 calls a day and 30,000 a month (confirmed by the user on 2026-11-10). Each search costs 2 calls, because `server/utils/reed.ts` runs the exact-phrase and broad tiers concurrently. Three gaps stop this data being used well, and stop it scaling to API traffic:

1. **Duplicate calls on a cold search.**
   - The results page requests listings (`/api/market-data/jobs`) and the histogram (`/api/market-data/salary`, which after `server-side-mca-engine` goes through the engine) at the same time.
   - `salary.ts` reuses `jobs.ts`'s cache entry, but only if that entry already exists. On a cold search both requests miss and both call Reed, so 4 calls instead of 2.
   - The `reed-api-fallback` spec already requires a single fetch; it doesn't cover concurrency.
2. **No percentiles.** The live tier exposes only a 7-bucket histogram and a mean, computed from IQR-trimmed salaries in `server/utils/jobTiering.ts`. A benchmarking product needs p10–p90 and the sample size behind them.
3. **No location fallback and no quota awareness.**
   - A town with five matching ads gives a thin, noisy live tier, and nothing falls back to a wider area.
   - Nothing tracks Reed usage. Once API traffic arrives, a burst could exhaust the daily quota and leave cold UK searches with no live tier, falling back to ONS data alone.

## What Changes

- **Single-flight Reed searches.** Concurrent requests for the same cache key share one in-flight Reed search per instance, so a cold results page costs 2 Reed calls, not 4.
- **Live percentiles.** `buildTieredJobResponse` computes p10/p25/p50/p75/p90 and `sampleSize` from the same trimmed salaries as the mean. They're stored in the jobs and distribution caches and returned by the engine's `live` block.
- **Reed quota guard.**
  - A Firestore-backed counter of actual Reed HTTP calls, per UTC day and per month.
  - Before a live search, if the remaining budget is below the call reserve, the request serves the newest cached entry even if expired (`stale: true`). With no cache at all it returns no live tier so the engine falls back to ONS data.
  - The caps are server runtime config.
- **Live geo cascade, in the engine.** When the exact location's sample is below a minimum size, the engine tries, in order:
  1. A fresh cached entry for the same search at the location's **region**.
  2. The cached **national** entry scaled by the ONS regional all-roles ratio.

  It **never** makes an extra Reed call to fill a tier. The `live` block reports `basis` (`exact`, `regional-cache`, `national-scaled`) and `sampleSize`.

- **Nightly pre-warm cron** `GET /api/cron/prewarm-live`:
  - Ranks UK (title, location, schedule, contract) demand from the last 30 days of `search_history`.
  - Refreshes entries that are missing or expire within the next 24 hours, most-demanded first.
  - Stops at a configurable budget (default 300 calls, 30% of the daily cap) or when the quota guard says no.
  - Emails a summary.
- **Licence flag.** Every live result already carries `provider`. This change keeps it on the engine output so `api-keys-metering-billing` can withhold Reed-derived data from API keys until the Reed licence question is answered.

## Scope

- The single-flight wrapper, percentile computation, quota guard, live cascade in the engine, and pre-warm cron.
- UK only for the quota guard and cascade, since Reed serves only UK. USA (Careerjet → Jooble) also benefits from single-flight deduplication and percentiles, since both providers use `buildTieredJobResponse`.

## Non-goals

- Reed licence or commercial terms (user action), and exposing live data through the API (`api-keys-metering-billing`, behind a flag).
- A shared cross-instance lock for single-flight. Per-instance deduplication removes the common case (one page's two parallel requests land on one instance under Fluid Compute). Rare cross-instance duplicates are bounded by the quota guard.
- Careerjet or Jooble quota tracking. The same guard pattern could be applied later if needed.
- Changing cache TTLs (`liveCachePrimaryTtlDays` and `liveCacheFallbackTtlHours` from server `runtimeConfig`, introduced in `remove-adzuna-official-industry-trends`).

## Capabilities

### New Capabilities

- `live-market-cascade`: the Reed quota guard, stale-serve behaviour, live geo cascade with `basis` and `sampleSize`, and the demand-ranked pre-warm.

### Modified Capabilities

- `reed-api-fallback`: "Server-Side Statistical Calculation" adds percentiles plus sample size, and concurrent-request deduplication.

## Impact

- **New:**
  - `server/utils/providerQuota.ts` (+ tests)
  - `server/utils/singleFlight.ts` (+ tests)
  - `server/utils/liveCascade.ts` (+ tests)
  - `server/utils/prewarm.ts` (+ tests)
  - `server/api/cron/prewarm-live.get.ts` (+ tests)
- **Modified:**
  - `server/utils/jobTiering.ts`
  - `server/utils/reed.ts`
  - `server/api/market-data/{jobs,salary}.ts`
  - `server/utils/engine/computeBenchmark.ts`
  - `shared/utils/market-data.ts` (response types)
  - `nuxt.config.ts` (non-secret server config)
  - `vercel.json` (one cron)
  - `firestore.rules` (`provider_usage` server-only)
  - all with tests
- **Quota:**
  - Cold UK page views cost 2 Reed calls instead of 4.
  - Pre-warm spends at most 300 calls a night (≤150 searches).
  - User traffic keeps 700+ calls a day of headroom before the guard starts serving stale data.
- **No new runtime dependencies.**
