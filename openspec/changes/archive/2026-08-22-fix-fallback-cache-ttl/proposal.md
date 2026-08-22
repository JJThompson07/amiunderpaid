## Why

The Phase 4 refactor folded the Reed/Jooble fallback into the same `cachedFunction` return path as the primary Adzuna provider, and in doing so lost the fallback's own short expiry. Previously the fallback branch set its own 24-hour expiry independent of the primary provider's cache window. Now both `server/api/market-data/jobs.ts:278-293` and `server/api/market-data/salary.ts:229-242` fall through to a single `cacheDays` path defaulting to 30 days regardless of which provider actually served the data. `salary.ts` can end up caching even longer, since it reads `categoryTag` from the jobs cache (`:217-224`) rather than forcing `'unknown'` when the data came from a fallback.

A single Adzuna 429 for a popular job title now pins the smaller-sample Reed/Jooble data in cache for up to a month, even though Adzuna recovers within minutes. Because `microRegionalData`/market averages feed `calculateLivePercentile` and the MCA score shown to users, the titles most likely to trigger a rate limit are the ones that stay degraded longest. The fallback exists to survive a transient failure; caching it at the primary's TTL inverts that purpose.

## What Changes

- Give fallback-provider (non-Adzuna) results a fixed 24-hour cache expiry, independent of the configured `cacheDays`.
- Keep Adzuna results on the existing `cacheDays` (default 30, down from 120 — that reduction is a genuine improvement and is kept as-is).
- Apply the same fix identically to `jobs.ts` and `salary.ts`.
- Prevent `salary.ts` from inheriting a long `cacheDays` via `categoryTag` when the data it is about to cache came from a fallback provider rather than Adzuna.

## Scope

`server/api/market-data/jobs.ts`, `server/api/market-data/salary.ts`, and their test suites.

## Non-Goals

- Changing the 30-day default `cacheDays` for Adzuna data, or the per-category override mechanism — both are working as intended.
- Any change to provider selection/fallback routing logic itself (covered by `reed-api-fallback` / `jooble-api-fallback`).

## Capabilities

### New Capabilities

- `market-data-caching`: defines cache-expiry behavior for market-data endpoints as a function of which provider actually served the response, previously undocumented.

## Impact

- **Affected code:** `server/api/market-data/jobs.ts`, `server/api/market-data/salary.ts`, `server/api/market-data/tests/jobs.spec.ts`, `server/api/market-data/tests/salary.spec.ts`.
- **User-facing effect:** users searching a title that recently fell back to Reed/Jooble will see fresher data within 24 hours instead of up to 30 days, at the cost of slightly more upstream fallback-provider calls during sustained Adzuna outages.
