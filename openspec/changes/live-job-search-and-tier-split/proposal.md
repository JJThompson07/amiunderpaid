# Proposal

## Why

Currently, users on the platform can only search for roles within the context of a salary comparison (`/salary` or `/benchmark`), requiring them to provide a current or target salary to evaluate an MCA score. Job seekers frequently want to browse live market job openings for a specific role and region without entering a salary figure, while still benefiting from real-time salary transparency, sorting capabilities, and SEO-friendly role discovery.

Furthermore, our backend market data pipeline currently executes Tier 1 (exact-phrase) and Tier 2 (broader anchor/keyword) searches in an "either-or" fallback manner, capping results to 10 by default and discarding valuable broader roles when Tier 1 succeeds, or discarding exact roles when Tier 1 is sparse. By fetching up to 100 roles across providers (Reed, Adzuna, Jooble) and returning both distinct **Tier 1 (Exact Matches)** and **Tier 2 (Similar Roles)** sets, we can present a richer, tiered job search experience, improve SEO landing pages, and share the cached results directly with subsequent salary searches for zero-API-call performance.

## What Changes

- **New Job Search Route & Landing Page (`/jobs`)**: Create a dedicated job search experience at `/jobs` and SEO-friendly parameterized pages at `/jobs/[title]/[country]/[[location]]`.
- **Search Form Job Mode**: Update `BaseSearchForm.vue` to support a `'jobs'` mode that omits the salary input field, dynamically sets button copy to search jobs, and routes queries to `/jobs/...`.
- **Dual-Tier Results Presentation**: Display roles divided into two separate, clearly labelled sections:
  1. **Exact Matches**: Specific roles matching the exact job title query (Tier 1).
  2. **Similar Roles**: Related / broader roles matching the anchor phrase and keywords (Tier 2), deduplicated from exact matches.
- **Role Sorting by Salary & Relevance**: Allow users to sort job listings by:
  - Highest Salary (Maximum potential salary `salary_max` descending).
  - Most Relevant (Default relevance ranking).
    Sorting controls update both Exact and Similar lists concurrently while keeping the two sections separate.
- **Shared Cache Warm-Up & Increased Result Limits**:
  - Increase fetch limits to 100 roles across Reed, Adzuna, and Jooble.
  - Return full result sets without slicing down to 10 in `server/api/market-data/jobs.ts`.
  - Harmonize cache key generation and payload storage in `adzuna_jobs_cache` between `jobs.ts` and `salary.ts` so job searches and salary searches mutually reuse warmed cache documents without redundant upstream API requests.
- **SEO & Structured Data**:
  - Add dynamic `useSeoMeta` and JSON-LD structured data (`BreadcrumbList` and `ItemList`) to `/jobs/[title]/[country]/[[location]]`.
  - Add `/jobs` static route and dynamic job URLs to `server/routes/sitemap.xml.ts`.
- **Navigation & i18n**: Add "Job Search" / "Jobs" link to `AmI/NavBar.vue` and complete translation strings across `en-GB` and `en-US`.

## Capabilities

### New Capabilities

- `live-job-search`: End-to-end user experience for searching and browsing live market job listings without entering a salary, including dual-tier display (Exact vs. Similar), multi-criteria salary/relevance sorting, responsive card presentation, and structured metadata for search engines.

### Modified Capabilities

- `search-relevance-and-specificity`: The market data provider pipeline SHALL return both Tier 1 (exact title match) and Tier 2 (anchor phrase / similar roles) datasets simultaneously, deduplicated and capped up to 100 roles, rather than short-circuiting as an either-or fallback.
- `market-data-caching`: The `adzuna_jobs_cache` cache keys and document payloads SHALL store full dual-tier job results up to 100 items and harmonize cache key naming between `/api/market-data/jobs` and `/api/market-data/salary` to maximize cross-feature cache hit rates.

## Impact

- **Frontend**: `app/pages/jobs/index.vue`, `app/pages/jobs/[title]/[country]/[[location]].vue`, `app/components/BaseSearchForm.vue`, `app/components/AmI/NavBar.vue`, `app/composables/useJobs.ts`, `app/composables/useJobSearchEngine.ts`.
- **Backend API**: `server/api/market-data/jobs.ts`, `server/api/market-data/salary.ts`, `server/utils/reed.ts`, `server/utils/adzuna.ts`, `server/utils/jooble.ts`, `server/routes/sitemap.xml.ts`.
- **Shared Types**: `shared/utils/market-data.ts`.
- **Locales**: `i18n/locales/en-GB/*.json`, `i18n/locales/en-US/*.json`.
- **Tests**: Unit tests for all modified utilities and new composables, plus e2e test for job search flows.
