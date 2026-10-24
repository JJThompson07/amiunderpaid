## Why

The monthly industry-trends sync derives which category/country pairs to call Adzuna for from `adzuna_jobs_cache` (live job-search cache traffic), not from the fixed set of categories Adzuna actually tracks per country. A category only gets synced if someone searched it recently enough to leave an unexpired-or-not-yet-purged cache entry — so categories with lower recent search volume silently stop receiving new data every month, with no error and no signal. In production this has left 24 of 27 UK industries and the majority of US industries stuck months behind, including some of the highest-historical-traffic categories (`sales-jobs`, `engineering-jobs`, `trade-construction-jobs`). The existing `industry-trends` spec already says the sync covers "all tracked categories" / "1 API call per tracked category per country" — the current implementation's cache-gated scope silently narrows that to a shrinking, traffic-dependent subset, which the spec never actually called for.

The fix is cheap: Adzuna's own `/jobs/{country}/categories` endpoint already returns every category tracked for that country in a single call, and the sync already calls it every run (`fetchCategoryLabels` in `industryTrendsSync.ts`) — today purely for display labels. Syncing every category it returns, every month, costs roughly `2 + x + y` Adzuna calls (2 category-list calls plus one `/history` call per category across both countries) — on the order of 50 calls/month against the account's 2,500/month cap, nowhere near needing traffic-based scope-narrowing in the first place.

## What Changes

- Replace `extractActiveCategoryCountryPairs(cacheDocs)` (derived from `adzuna_jobs_cache`) as the source of which category/country pairs the sync processes, with the category tags already returned by the per-country `/categories` call (`fetchCategoryLabels`). Every category Adzuna returns for a tracked country is synced every run, unconditionally — sync scope no longer depends on recent search-cache activity.
- Sync a fixed set of countries (`gb`, `us` — this app's two tenants) rather than deriving `countriesInUse` from cache-doc traffic.
- Remove `extractActiveCategoryCountryPairs` and its dedicated tests (`server/utils/adzunaHistory.ts` / `server/utils/tests/adzunaHistory.spec.ts`) once nothing references it — it becomes dead code once sync scope no longer reads `adzuna_jobs_cache`.
- Keep `countCategoryLookups`/`lookupCount` unchanged in purpose: it continues reading `adzuna_jobs_cache` to rank categories by recent search activity for the frontend's default-selected-industries behavior, but is no longer wired to sync eligibility — a category with zero recent lookups still gets synced, it just reports `lookupCount: 0`.
- Add a pre-flight verification task to confirm, against Adzuna's real `/categories` response for `gb` and `us`, the actual category count and that none of the currently-live credentials return an auth failure in production (a local-only `.env` credential check during this investigation returned `401 AUTH_FAIL`, which needs to be confirmed as local-only before relying on it in code).

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `industry-trends`: the "Historical Data Storage" requirement's "all tracked categories" / "1 API call per tracked category per country" scenarios are clarified to explicitly define "tracked categories" as the live category taxonomy returned by Adzuna's own `/categories` endpoint for each tracked country, not a subset gated by recent `adzuna_jobs_cache` search activity.

## Impact

- `server/utils/industryTrendsSync.ts`: `syncOne`/`runIndustryTrendsSync` category/country pair derivation and country iteration.
- `server/utils/adzunaHistory.ts`: removes `extractActiveCategoryCountryPairs` (dead code after this change); `countCategoryLookups` unchanged.
- `server/utils/tests/industryTrendsSync.spec.ts`: sync-scope tests re-mocked against the `/categories` response instead of `adzuna_jobs_cache` docs.
- `server/utils/tests/adzunaHistory.spec.ts`: removes `extractActiveCategoryCountryPairs` test coverage.
- No change to `server/api/admin/sync-trends.post.ts` or `server/api/cron/sync-trends.get.ts` call signatures.
- Adzuna call volume per monthly run increases from "however many categories had recent search traffic" to the full tracked set per country (~50 calls/month combined, still trivial against the 2,500/month cap).
