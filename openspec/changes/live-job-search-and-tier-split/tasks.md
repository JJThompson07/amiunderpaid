# Tasks

## 1. Schema & Backend Provider Tier Splitting

- [x] 1.1 Update `shared/utils/market-data.ts` to add `similarResults?: JobListing[]` to `JobSearchResponse` and verify typecheck with `pnpm typecheck`.
- [x] 1.2 Refactor `server/utils/reed.ts` to run Tier 1 and Tier 2 searches concurrently (`Promise.all`, not the current sequential either-or fallback), returning both `results` (Tier 1 exact matches) and `similarResults` (Tier 2 similar roles deduplicated against Tier 1 by `id`), with `mean`/`histogram` computed from the combined deduplicated pool rather than Tier 1 alone (split `processReedData`'s filter→trim→stat pipeline into a reusable stats step over the merged set — see design.md Decision 2). Update `server/utils/tests/reed.spec.ts`, and verify with `pnpm vitest run server/utils/tests/reed.spec.ts`.
- [x] 1.3 Refactor `server/utils/adzuna.ts`'s `fetchAdzunaJobs` to run Tier 1 (`title_only: title`) and Tier 2 (`title_only: anchorPhrase`, whenever `anchorPhrase !== title`) concurrently instead of the current sequential short-circuit (`adzuna.ts:198-203`), returning per-tier `results`/`similarResults` (deduplicated by `id`) with `mean`/`histogram` computed from the combined pool (same restructuring as `processReedData`). Leave `fetchAdzunaHistogram` unchanged — no `similarResults` concept applies to it. Update `server/utils/tests/adzuna.spec.ts`, and verify with `pnpm vitest run server/utils/tests/adzuna.spec.ts`.
- [x] 1.4 Refactor `server/utils/jooble.ts`'s `processJoobleData` to partition parsed jobs using `calculateTitleRelevanceScore` — `results` where score `=== 1.0`, `similarResults` where score `> 0` and seniority-compatible; listings scoring `0` are dropped entirely, a new filtering behavior for Jooble (today it passes all raw results through unfiltered). Update `server/utils/tests/jooble.spec.ts` to cover the drop case, and verify with `pnpm vitest run server/utils/tests/jooble.spec.ts`.

## 2. API Endpoint Caching & Harmonization

- [x] 2.1 Update `server/api/market-data/jobs.ts` so the object **persisted to `adzuna_jobs_cache`** is the full up-to-100 dual-tier result (no slicing before the Firestore write), while the **response returned to the caller** keeps its existing `.slice(0, limit)` behavior (`limit` defaulting to 10, unchanged for callers that omit `resultsPerPage`). Harmonize `cacheKey` format without the `-${limit}` suffix. Add a regression test confirming a request with no `resultsPerPage` (the shape `useLocationEngine.ts` sends) still returns exactly 10 `results` and no `similarResults` inflation, alongside the existing/updated `server/api/market-data/tests/jobs.spec.ts`. Verify with `pnpm vitest run server/api/market-data/tests/jobs.spec.ts`.
- [x] 2.2 Update `server/api/market-data/salary.ts` to remove the hardcoded `-10` suffix on `jobsCacheKey` (`salary.ts:319`) and align it with the harmonized `jobs.ts` cache key, update `server/api/market-data/tests/salary.spec.ts`, and verify with `pnpm vitest run server/api/market-data/tests/salary.spec.ts`.

## 3. Frontend Composables & Search Form Mode

- [x] 3.1 Update `app/composables/useJobs.ts` to expose `similarJobsData` / `similarResults` and full listing arrays, update `app/composables/tests/useJobs.spec.ts`, and verify with `pnpm vitest run app/composables/tests/useJobs.spec.ts`.
- [x] 3.2 Implement `app/composables/useJobSearchEngine.ts` with route param parsing, multi-criteria sorting (`relevance`, `salary_max`, `salary_avg`, `salary_min`), dual-tier list separation, write unit tests in `app/composables/tests/useJobSearchEngine.spec.ts`, and verify with `pnpm vitest run app/composables/tests/useJobSearchEngine.spec.ts`.
- [x] 3.3 Extend `app/components/BaseSearchForm.vue` to support `mode="jobs"`, hiding the salary input, customizing button text, and routing to `/jobs/...`.

## 4. Job Search Pages, Components & SEO

- [x] 4.1 Add localized strings across `i18n/locales/en-GB/*.json` and `i18n/locales/en-US/*.json` (`navbar.json`, `buttons.json`, `search.json`, `meta.json`, `card.json`, `sections.json`) for all job search UI labels and meta tags.
- [x] 4.2 Create `app/pages/jobs/index.vue` landing page with hero header, `BaseSearchForm` (`mode="jobs"`), popular role tags, and value proposition cards.
- [x] 4.3 Create `app/pages/jobs/[title]/[country]/[[location]].vue` dynamic results page with breadcrumbs, prefilled search bar, salary benchmark pill link, sorting toolbar, separate Exact Matches and Similar Roles sections (`AmICardRole`), recruiter card integration, `AmICardNoData`, and JSON-LD structured data.
- [x] 4.4 Update `app/components/AmI/NavBar.vue` to add the "Jobs" navigation link for all visitor roles.
- [x] 4.5 Update `server/routes/sitemap.xml.ts` and `server/routes/tests/sitemap.xml.spec.ts` to index `/jobs` and dynamic `/jobs/...` routes.

## 5. End-to-End Testing & Verification Gate

- [x] 5.1 Create Playwright e2e test `e2e/job-search.spec.ts` testing landing page search submission, sorting by salary, dual-tier listing display, and navigation to salary benchmark page.
- [x] 5.2 Run complete local verification gate `pnpm test:verify` ensuring zero lint, typecheck, coverage (<80%), e2e, or rules test failures.
