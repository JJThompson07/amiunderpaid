# Design: Live Job Search and Tier 1 / Tier 2 Split

## Context

Am I Underpaid and Benchmark My Role currently guide all role searches through salary comparison workflows (`/salary` and `/benchmark`). The market data aggregation layer (`server/api/market-data/jobs.ts` and `server/api/market-data/salary.ts`) talks to Reed (UK primary), Adzuna (USA primary / UK fallback), and Jooble (USA fallback).

Currently, `server/utils/reed.ts` and `server/utils/adzuna.ts` execute a Tier 1 (exact phrase/title) query, and if it meets a minimum count threshold (15 for Reed, 3 for Adzuna), it returns Tier 1 and completely ignores Tier 2. If it falls below the threshold, it executes Tier 2 and replaces Tier 1. Furthermore, `jobs.ts` truncates results to 10 by default (`results.slice(0, limit)`) before caching to Firestore under a key ending in `-10`.

This design introduces a first-class job search experience (`/jobs` and `/jobs/[title]/[country]/[[location]]`), refactors provider utilities to return both Tier 1 (Exact Matches) and Tier 2 (Similar Roles) up to 100 listings, harmonizes cache storage across endpoints, and provides multi-criteria sorting for job seekers.

## Goals / Non-Goals

**Goals:**

- Provide a dedicated, salary-free job search landing page (`/jobs`) and parameterized result pages (`/jobs/[title]/[country]/[[location]]`).
- Extend `BaseSearchForm.vue` to support `mode="jobs"`.
- Refactor `reed.ts`, `adzuna.ts`, and `jooble.ts` to return both Tier 1 (`results`) and deduplicated Tier 2 (`similarResults`) with up to 100 listings per provider query.
- Harmonize Firestore `adzuna_jobs_cache` keys and payloads between `jobs.ts` and `salary.ts` so that job searches and salary searches mutually share cached data.
- Enable client-side multi-criteria sorting (Highest Potential Salary, Average Salary, Lowest Salary, Relevance) affecting both Exact and Similar listings independently.
- Provide comprehensive SEO tags and JSON-LD structured data (`BreadcrumbList`, `ItemList`/`JobPosting`).

**Non-Goals:**

- Ingesting third-party job application submissions or hosting internal job applications (application links redirect to provider source URLs).
- Replacing the existing `/salary` or `/benchmark` pages (they continue to function and benefit from the shared cache).
- Modifying government benchmark data schemas (ONS / BLS).

## Decisions

### Decision 1: Extended `JobSearchResponse` Schema with `similarResults`

**Decision:** Update `JobSearchResponse` in `shared/utils/market-data.ts` to include an optional `similarResults?: JobListing[]` array while keeping `results: JobListing[]` as the primary (Tier 1) set.

```typescript
export type JobSearchResponse = {
  mean: number;
  count: number;
  results: JobListing[];
  similarResults?: JobListing[];
  provider: MarketDataProvider;
  histogram?: Record<number, number>;
};
```

**Rationale:**

- Keeps full backward compatibility with `useLocationEngine` and existing salary/benchmark pages which read `results`.
- Explicitly separates exact-match listings from broader similar listings at the schema level.

### Decision 2: Provider Pipeline Tier Splitting

**Decision:** Update `reed.ts`, `adzuna.ts`, and `jooble.ts` to fetch and process both exact-phrase queries (Tier 1) and relaxed keyword/anchor-phrase queries (Tier 2), deduplicating by listing `id`:

1. **Reed (`server/utils/reed.ts`)**:
   - Query 1 (Tier 1): Exact phrase keywords (`"${title}" OR "${anchorPhrase}"` + category).
   - Query 2 (Tier 2): Unquoted keyword search (`${title} ${categoryKeyword}`), run concurrently with Tier 1 via `Promise.all` rather than as a sequential fallback.
   - Relevance-filter/rank both raw sets independently, then strip any listing ID from Tier 2 that already exists in Tier 1.
   - `results` = deduplicated Tier 1 set; `similarResults` = deduplicated Tier 2 set; `count = results.length + similarResults.length`.
   - `mean`/`histogram` are computed from the **combined, IQR-trimmed sample** (`results` ∪ `similarResults`, salary-sanitized and outlier-trimmed together) — not from Tier 1 alone — per the `search-relevance-and-specificity` delta spec's "prioritizing the combined relevant sample" scenario. This requires splitting `processReedData`'s current single filter→trim→stat→sort pipeline into a reusable stats step callable on the merged pool, separate from the per-tier listing arrays.

2. **Adzuna (`server/utils/adzuna.ts`)**:
   - Query 1 (Tier 1): `title_only: title`.
   - Query 2 (Tier 2): `title_only: anchorPhrase`, run concurrently with Tier 1 whenever `anchorPhrase !== title` (replacing today's sequential "Tier 1 short-circuits Tier 2" gate at `adzuna.ts:198-203`).
   - Process both through `processAdzunaJobs`, applying the same Reed-style split: per-tier `results`/`similarResults` arrays, but `mean`/`histogram` from the combined deduplicated pool (same restructuring as `processReedData` above).
   - Deduplicate Tier 2 against Tier 1 by `id`.
   - `fetchAdzunaHistogram` (the separate `/histogram` endpoint helper) keeps its existing single-query-with-fallback behavior unchanged — it has no per-listing `results`/`similarResults` concept to split, and `jobs.ts`'s combined-pool stats already supersede it for the job-search page's own histogram needs.

3. **Jooble (`server/utils/jooble.ts`)**:
   - Query anchor phrase keywords (single query, as today — Jooble's tiering is a post-fetch classification, not a second query).
   - In `processJoobleData`, partition listings into `results` (where `calculateTitleRelevanceScore(job.title, searchTitle) === 1.0`) and `similarResults` (score `> 0` and seniority-compatible, i.e. everything `filterAndRankJobsByRelevance` would currently keep).
   - **Behavior change note**: `jooble.ts` currently applies no relevance filtering at all — every raw Jooble result passes through unfiltered. This change means listings scoring `0` (missing a required domain token) are dropped entirely rather than shown. Since Jooble only fires as the USA-fallback when Adzuna fails, this brings it in line with Reed/Adzuna's existing filtering but can reduce the listing count shown on that fallback path versus today.

**Alternatives Considered:**

- _Calling Tier 2 only on demand from the client_: Requires two separate round-trips from the browser, doubling client latency and preventing unified server-side caching.

### Decision 3: Cache Harmonization Across Endpoints

**Decision:**

- In `server/api/market-data/jobs.ts`, generate `cacheKey` as:
  `${generateCacheKey(titleStr, locationStr, countryCode, categoryStr)}-${typeStr}-${contractStr}`
  (removing the `-${limit}` suffix).
- In `server/api/market-data/salary.ts`, align `jobsCacheKey` to the identical key:
  `${generateCacheKey(titleStr, locationStr, countryCode, categoryStr)}-${typeStr}-${contractStr}`.
- Persist the full uncapped 100-result array (with `similarResults` and `histogram`) in `adzuna_jobs_cache`, regardless of what `limit` the requesting caller asked for.
- The **response returned to the caller** stays capped at `limit`/`resultsPerPage` (default 10, applied via `.slice(0, limit)` on top of the now-fully-populated cache doc), unchanged from today. `useLocationEngine.ts` (which powers `/salary` and `/benchmark`) never passes `resultsPerPage`, so it continues to receive exactly 10 `results` and no `similarResults` — only `/jobs` pages request a higher `resultsPerPage` to see the larger dual-tier set. This preserves existing `/salary`/`/benchmark` rendering while still letting every caller benefit from the shared, fully-populated cache document.

**Rationale:**

- When a user performs a job search on `/jobs/...`, `jobs.ts` warms `adzuna_jobs_cache` with the full dual-tier payload.
- When another user visits `/salary/...` for that role, `salary.ts` and `jobs.ts` immediately hit the warmed cache document (sliced back down to 10 for that caller), resulting in 0 third-party API calls.
- Maximizes cache efficiency without storing duplicate documents, and without silently changing how many listings existing pages render.

### Decision 4: Composable Architecture (`useJobSearchEngine`)

**Decision:** Create `app/composables/useJobSearchEngine.ts` to encapsulate all job-search page logic:

- Route param unslugifying and active country detection.
- Asynchronous data fetching via `useJobs().fetchJobs()`.
- Active sort mode (`'relevance' | 'salary_max' | 'salary_avg' | 'salary_min'`).
- Computed sorted lists:
  - `sortedExactListings`: Tier 1 listings sorted according to active sort mode.
  - `sortedSimilarListings`: Tier 2 listings sorted according to active sort mode.
- Overall role count, mean salary, and recruiter card integration.

### Decision 5: Page Architecture and SEO Routing

**Decision:**

- `app/pages/jobs/index.vue`: Job search landing with hero, `BaseSearchForm` (`mode="jobs"`), popular role tags, and site value proposition.
- `app/pages/jobs/[title]/[country]/[[location]].vue`: Dynamic job listings page rendering:
  1. Breadcrumbs (`AmILocationBreadcrumbs`).
  2. Page title & count banner.
  3. Pre-filled `BaseSearchForm` (`mode="jobs"`).
  4. Salary benchmark banner (linking to `/salary/[title]/[country]/[location]`).
  5. Sorting toolbar (Relevance, Highest Salary, Average Salary, Lowest Salary).
  6. **Exact Matches** grid (`AmICardRole`).
  7. **Similar Roles** grid (`AmICardRole`).
  8. Recruiter card integration.
  9. `AmICardNoData` when both lists are empty. **Correction (found during implementation):** the originally-named `LazySectionNoData` (`Section/NoData.vue`) is not a generic "no results" component — it's a government-benchmark-specific Algolia autocomplete against `salary_benchmarks`/`regional_salary_benchmarks`, emitting a `select` event for MCA/government-ID disambiguation, with a `broadenSearch` hardcoded to `/salary` or `/benchmark`. None of that applies to a job-search results page. `AmICardNoData` (`AmI/Card/NoData.vue`) is the already-existing generic empty-state card (icon + heading + body + "try a different search" link home) and is what's actually used.
  10. `useSeoMeta` and JSON-LD `BreadcrumbList` & `ItemList` structured data.
- Update `AmI/NavBar.vue` to include a "Jobs" link.
- Update `server/routes/sitemap.xml.ts` to index `/jobs` and dynamic `/jobs/...` routes.

## Risks / Trade-offs

| Risk                                                                                                                                                                                                                                                     | Mitigation                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Running two provider queries (Tier 1 & Tier 2) on cold cache increases server response time by ~200-400ms.                                                                                                                                               | Queries can be executed concurrently via `Promise.all([tier1Query, tier2Query])`. Responses are cached for 30 days, so subsequent requests have sub-50ms latency.                                                                                              |
| Cache document size increases with up to 100 listings.                                                                                                                                                                                                   | Firestore document limit is 1MB; 100 normalized job listings consume ~35KB, well below the limit.                                                                                                                                                              |
| Some job listings do not specify salary.                                                                                                                                                                                                                 | When sorting by salary, listings without salary data are gracefully sorted to the bottom of the list with 'Salary not provided' indicator.                                                                                                                     |
| Slicing removed only from Firestore persistence, not from API responses — a careless implementation could also drop the response-side `.slice(0, limit)` in `jobs.ts`, silently changing `/salary`/`/benchmark`'s rendered listing count from 10 to 100. | Task 2.1 keeps `.slice(0, limit)` on the returned payload; only the object written to Firestore is unsliced. Task 2.1 includes a regression test confirming `useLocationEngine.ts`'s default (no `resultsPerPage`) request still returns exactly 10 `results`. |
