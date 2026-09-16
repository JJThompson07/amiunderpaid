## Why

Users searching for salary benchmarks and job market rates currently query solely by job title, location, schedule, and contract type. In broad or multi-disciplinary professions (e.g., "Project Manager", "Consultant", "Data Analyst"), market compensation varies drastically across different sectors (e.g., Tech vs Healthcare vs Finance). Adding an optional Industry filter to the search form enables users to narrow their query to a specific industry domain, significantly increasing the accuracy and relevance of returned salary distributions and job listings while paving the way for future industry trend visualisations on results pages.

## What Changes

- **1. Search Form Industry Dropdown (`app/components/BaseSearchForm.vue`)**:
  - Add an optional Industry select dropdown to the search form using `AmIInputSelect` (`single: true`, `optional: true`).
  - The dropdown defaults to empty/null ("All Industries"), keeping the field optional so existing search behaviour remains friction-free.
  - Sourced directly from `useJobs().categories` and `useJobs().fetchCategories(country)` (calling `/api/market-data/categories`), which provides the full live, country-scoped `{ tag, label }` taxonomy from Adzuna without the lookupCount/popularity filtering of `useIndustryTrends`.
  - Dynamically re-fetch categories when the active country changes (e.g. toggling UK/USA tabs in benchmark mode).
  - Include the selected industry tag as an optional query parameter (`category`) when navigating to `/salary/...` or `/benchmark/...`.

- **2. Market Data Gateway Integration (`server/api/market-data/jobs.ts` & `server/api/market-data/salary.ts`)**:
  - Accept an optional `category` query parameter in both market data gateway endpoints.
  - Distinguish explicitly between the **input filter parameter** (`searchParams.category` and cache key generation) and the existing **derived `categoryTag`** (used solely for `adzuna_category` Firestore TTL overrides).
  - Update `generateCacheKey` in `server/utils/adzuna.ts` to accept `category?: string` (`${country}-${l}-${t}${category ? `-cat-${category}` : ''}`) and splice into `cacheKey` in `jobs.ts` (`${generateCacheKey(titleStr, locationStr, countryCode, categoryStr)}-${typeStr}-${contractStr}-${limit}`) and `salary.ts` (`generateCacheKey(titleStr, locationStr, countryCode, categoryStr)`).
  - Update Nitro in-memory cache memoization (`getKey` in `defineCachedFunction`) to include `categoryStr`.
  - Pass the native `category` parameter to Adzuna search and histogram requests.

- **3. Fallback Providers Strategy (`server/utils/reed.ts`, `server/utils/jooble.ts`, `server/utils/fallback.ts`)**:
  - **Adzuna**: Pass native `category: categoryTag` query parameter to `/search/1` and `/histogram`.
  - **Reed (UK Fallback)**: Since Reed's API accepts `keywords` rather than Adzuna category tags, accept `category?: string` and enhance the `keywords` query (e.g. appending the human-readable category keyword) while Task 1.1 confirms if any sector parameter is available.
  - **Jooble (USA Fallback)**: Since Jooble's API body accepts `keywords` rather than Adzuna category tags, accept `category?: string` and enhance the `keywords` field with the category term.
  - **Fallback Orchestrator (`server/utils/fallback.ts`)**: Update `executeMarketFallback` signature to accept `category?: string` and forward it to `fetchReedData` and `fetchJoobleData`.

- **4. Client State & Composables (`app/composables/useJobs.ts`, `app/composables/useLocationEngine.ts`)**:
  - Update `useJobs.fetchJobs` and `useJobs.fetchHistogram` to accept an optional `category?: string` parameter and include it in `$fetch` query params.
  - Update `useLocationEngine` to extract `route.query.category` (or `industry`) and pass it into `adzuna.fetchJobs` and `adzuna.fetchHistogram`.

- **5. Internationalization & Labels (`i18n/locales/en-GB/search.json`, `i18n/locales/en-US/search.json`)**:
  - Add translation keys for the Industry dropdown label, placeholder ("All Industries"), and helper text across UK and US locales.

### Scope & Non-Goals

- **In Scope**:
  - Optional Industry select in `BaseSearchForm.vue` for both `salary` and `benchmark` modes, backed by `useJobs().fetchCategories`.
  - Query parameter propagation on search submission (`/salary/...` and `/benchmark/...`).
  - Cache key isolation in `server/utils/adzuna.ts`, `jobs.ts`, and `salary.ts`.
  - Clean separation between filter `category` in `searchParams` and derived `categoryTag` for cache TTL.
  - Multi-provider forwarding (native for Adzuna, keyword-enhanced fallback for Reed/Jooble).
  - Unit tests covering all modified composables, server endpoints, and fallback utilities.
- **Non-Goals**:
  - Displaying historical industry trend charts on salary/benchmark results pages (deferred to a subsequent change).
  - Modifying government benchmark SOC taxonomy matching (`resolveUkIdentity`/`resolveUsaIdentity`).

## Capabilities

### New Capabilities

- `search-industry-filter`: Defines the UI dropdown component, client-side state handling via `useJobs().fetchCategories`, route query passing, and composable integration for optional industry filtering in search.

### Modified Capabilities

- `adzuna-adapter`: Adds category query support to outbound Adzuna search and histogram requests, and updates cache key generation and cache document schemas to be category-aware.
- `reed-api-fallback`: Adds category handling (via keyword enhancement) to Reed fallback data fetching.
- `jooble-api-fallback`: Adds category handling (via keyword enhancement) to Jooble fallback data fetching.

## Impact

- **Frontend Components & Composables**:
  - `app/components/BaseSearchForm.vue`
  - `app/composables/useJobs.ts`
  - `app/composables/useLocationEngine.ts`
- **Server Endpoints & Utilities**:
  - `server/api/market-data/jobs.ts`
  - `server/api/market-data/salary.ts`
  - `server/utils/adzuna.ts`
  - `server/utils/fallback.ts`
  - `server/utils/reed.ts`
  - `server/utils/jooble.ts`
- **Translations**:
  - `i18n/locales/en-GB/search.json`
  - `i18n/locales/en-US/search.json`
- **Tests**:
  - `server/api/market-data/tests/jobs.spec.ts`
  - `server/api/market-data/tests/salary.spec.ts`
  - `server/utils/tests/adzuna.spec.ts`
  - `server/utils/tests/fallback.spec.ts`
  - `server/utils/tests/reed.spec.ts`
  - `server/utils/tests/jooble.spec.ts`
  - `app/composables/tests/useJobs.spec.ts`
  - `app/composables/tests/useLocationEngine.spec.ts`
