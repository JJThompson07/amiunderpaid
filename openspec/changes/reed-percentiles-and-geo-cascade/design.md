## Context

- `fetchReedData` issues 2 Reed HTTP calls per search (tier 1 exact-phrase ∥ tier 2 broad, `Promise.allSettled`, `resultsToTake: 100` each). `buildTieredJobResponse` (`server/utils/jobTiering.ts`) sanitises, IQR-trims and builds `mean`, `count` and a 7-bucket `histogram`.
- `jobs.ts` caches in `market_jobs_cache` and `salary.ts` in `market_distribution_cache` (renamed from `adzuna_*_cache` in `remove-adzuna-official-industry-trends`), with a harmonised key (`generateCacheKey(title, location, country, category)-type-contract`). `salary.ts` reuses the jobs entry when it exists (`tryReuseJobsCacheHistogram`). The TTL is `config.liveCachePrimaryTtlDays` days (default 7) for primary provider responses with listings, or `config.liveCacheFallbackTtlHours` hours (default 24h) for fallback-provider or zero-listing data.
- `salary.ts` also wraps provider fetches in Nitro `cachedFunction`, but that only dedupes inside the salary route, not across jobs and salary.
- After `server-side-mca-engine`, the engine calls `/api/market-data/salary` internally. After `uk-geo-economics-ingestion`, `resolveUkLocation` and the regional all-roles medians are available.
- `search_history` docs: `{ title, country, location, schedule, contract, category, brand, timestamp }`. Titles and locations are lowercased; there's no SOC.

## Goals / Non-Goals

**Goals:**

- Each distinct UK search costs at most one Reed search (2 calls) per cache lifetime.
- Never exceed the Reed quota because of our own traffic patterns.
- The live tier is useful (percentiles, honest sample size) even in small places.

**Non-Goals:**

- Perfect global deduplication across serverless instances (D1).

## Decisions

### D1. Single-flight via an in-process promise map

`server/utils/singleFlight.ts`: `singleFlight<T>(key, fn)` keeps a `Map<string, Promise<T>>`, and an entry is deleted when its promise settles.

- Provider fetch callers in `jobs.ts` and `salary.ts` (Reed for UK, Careerjet → Jooble for USA) wrap the provider fetch with the harmonised cache key, so concurrent jobs and salary requests for one search share the result.
- Under Fluid Compute both requests from one page view usually hit one instance.
- Rejected alternative: a Firestore lease document. That adds 2 writes plus polling latency to every cold search, to save a rare duplicate the quota guard already bounds.

### D2. Percentiles from the trimmed sample

In `buildTieredJobResponse`:

- `percentiles = { p10, p25, p50, p75, p90 }` by linear interpolation over the sorted `trimmedSalaries`, plus `sampleSize = trimmedSalaries.length`. Percentiles are null when `sampleSize < 5`.
- They're added to `JobSearchResponse`, and to `SalaryDistributionResponse` in `shared/utils/market-data.ts`, as optional fields.
- They're persisted in both cache docs. Old cache docs without them read as `percentiles: null` and refresh naturally on expiry, so no migration is needed.

### D3. Quota guard

`server/utils/providerQuota.ts`:

- `reserveReedCalls(n)` runs a Firestore transaction on a single document, `provider_usage/reed-YYYY-MM` = `{ month: number, days: { 'DD': number } }`. If `month + n` or `days[DD] + n` would exceed its cap minus the reserve, it returns `false`; otherwise it increments `month` and `days.DD` in one write and returns `true`. One document per transaction halves the reads/writes and avoids cross-document contention between concurrent cold searches.
- It's called before each Reed search with `n = 2`. If one tier then fails without having reached Reed, the reservation isn't refunded. That's deliberately conservative, since counting is for protection, not billing.
- Config (server `runtimeConfig`, not public and not secret):

  | Key                     | Default |
  | ----------------------- | ------- |
  | `reedDailyCallCap`      | 1000    |
  | `reedMonthlyCallCap`    | 30000   |
  | `reedCallReserve`       | 50      |
  | `reedPrewarmCallBudget` | 300     |

  The reserve keeps headroom for user traffic.

- When reservation fails, `jobs.ts` and `salary.ts`:
  1. Serve the newest cached doc for the key even if expired, with `stale: true` in the response and **no** TTL change.
  2. Otherwise return no live data (empty listings in `jobs.ts`; 503 in `salary.ts` so `computeBenchmark` sets `live: null` and scores from ONS baselines alone, since UK has no secondary job-board fallback after `remove-adzuna-official-industry-trends`).
- The guard is skipped under `process.dev` / E2E, where Reed is mocked.
- Transaction contention: about 1 write per search. At current volume that's far below Firestore's per-document limit (~1 write/sec sustained). If API traffic approaches it, `api-keys-metering-billing`'s Redis can host the counter instead. That's noted there, not built here.

### D4. Live geo cascade in the engine

`server/utils/liveCascade.ts`, called by `computeBenchmark` for UK requests with a location:

```
exact  := live result for (title, location)            ── sampleSize ≥ MIN_LIVE_SAMPLE (10) ─► basis 'exact'
else region := resolveUkLocation(location).regionName
     cached entry for (title, region) fresh?            ── yes, sampleSize ≥ 10 ─► basis 'regional-cache'
else national := cached entry for (title, '') fresh?    ── yes ─► scale p-values & mean by
                                                            regionalAllRoles / nationalAllRoles ─► 'national-scaled'
else keep exact (even if thin)                           ─► basis 'exact', sampleSize as is
```

- The regional and national lookups are **cache reads only**, using the same harmonised key builder. The cascade never calls a provider. The exact-location request is the only live call, and it's what the page already makes.
- The engine output's `live` block gains `basis`, `sampleSize`, `percentiles` and `stale`.
- The scorer's `liveBuckets` input uses the chosen tier's histogram. For `national-scaled`, bucket values are scaled by the same ratio and counts are unchanged.

### D5. Demand-ranked pre-warm

`server/utils/prewarm.ts`:

- `rankDemand(db, days=30)` reads UK `search_history` since the cutoff projecting only the fields it uses: `title`, `location`, `schedule`, `contract`, `country` and `timestamp`. It normalises each entry to (title, location, schedule ?? 'full-time', contract ?? 'permanent'), counts occurrences and sorts descending.
- `prewarm(budget)` walks the ranked list:
  - It skips keys whose cache doc expires more than 24 hours from now.
  - Otherwise it calls the same provider path as `salary.ts` (extracted into a shared `refreshLiveEntry(args)`, so the cache-write logic exists once) through `reserveReedCalls`.
  - It stops when the budget is spent or a reservation fails.
- **Cron:** `GET /api/cron/prewarm-live` at `0 2 * * *`, `CRON_SECRET`-guarded, with a Resend summary (keys refreshed, calls spent, skipped as fresh, stopped reason). The run time limit is the project's function default of 300s (verified 2026-11-24: Fluid Compute on, `functionDefaultTimeout: 300`; task 5.5 re-checks before deploy). The loop also stops itself at 240s.
- **Failure handling:** a refresh where Reed fails leaves any existing cache entry untouched so the next night retries it.

## Risks / Trade-offs

- **[Risk] The quota guard's Firestore transaction adds latency to cold searches.**
  → About 20–40 ms on a path that already waits 1–6s for Reed. Warm (cached) searches never reach it.
- **[Risk] Stale-serve hides a Reed outage.**
  → Stale serving only happens when _our quota_ is low, not on Reed errors, which still go to the existing fallback. The response carries `stale: true`, and the pre-warm email reports daily usage.
- **[Risk] National-scaled live data misleads.**
  → `basis` is exposed. Consumer UI shows "Based on wider-area listings" for any basis other than `exact` (task 6.2).
- **[Trade-off] Pre-warm reads up to ~30 days of `search_history` nightly.**
  → About 1.6k docs in total today. If it grows past ~50k a month, switch to a daily rollup doc. Noted in code.
