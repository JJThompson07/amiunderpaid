## 1. Provider Compatibility & Server Utilities

- [ ] 1.1 Verify external provider API specifications for industry/category filtering:
  - **Adzuna**: Confirm `/search/1` and `/histogram` query parameter `category=<tag>` (e.g. `category=it-jobs`).
  - **Reed**: Confirm `/search` query parameters and verify keyword enhancement (`${keywords} ${categoryKeyword}`) for sector filtering.
  - **Jooble**: Confirm POST request body parameters and verify keyword enhancement (`${keywords} ${categoryKeyword}`) for sector filtering.
- [ ] 1.2 Update `server/utils/adzuna.ts`:
  - Extend `generateCacheKey(title: string, location: string, country: string, category?: string): string` to incorporate `-cat-${category}` when `category` is provided.
  - Update unit tests in `server/utils/tests/adzuna.spec.ts` asserting distinct cache keys for empty/omitted vs populated category values.
- [ ] 1.3 Update `server/utils/reed.ts` and `server/utils/jooble.ts`:
  - Update `fetchReedData` and `fetchJoobleData` to accept `category?: string` and apply keyword enhancement when `category` is provided.
  - Update unit tests in `server/utils/tests/reed.spec.ts` and `server/utils/tests/jooble.spec.ts` verifying category forwarding and fallback payload processing.
- [ ] 1.4 Update `server/utils/fallback.ts`:
  - Update `executeMarketFallback(title, location, countryCode, type, contract, category?)` to accept and forward `category` to `fetchReedData` (UK) and `fetchJoobleData` (USA).
  - Update unit tests in `server/utils/tests/fallback.spec.ts` covering category forwarding for both country branches.

## 2. Server API Gateway & Caching

- [ ] 2.1 Update `server/api/market-data/jobs.ts`:
  - Extract `category` query parameter from `getQuery(event)`.
  - Splice `categoryStr` into cache key computation: `const cacheKey = `${generateCacheKey(titleStr, locationStr, countryCode, categoryStr)}-${typeStr}-${contractStr}-${limit}`;`.
  - Update Nitro `defineCachedFunction` `getKey` memoizer to include `categoryStr`.
  - Pass `category` in Adzuna search params (`params.category = categoryStr`) and to `executeMarketFallback`.
  - Preserve `categoryTag` for TTL lookup in `adzuna_category` (`catSnap.data()?.cache || 30`) while storing `category: categoryStr || null` under `searchParams`.
  - Update unit tests in `server/api/market-data/tests/jobs.spec.ts` verifying category query handling, cache hit/miss behavior, and Adzuna/fallback calls.
- [ ] 2.2 Update `server/api/market-data/salary.ts`:
  - Extract `category` query parameter from `getQuery(event)`.
  - Splice `categoryStr` into cache key computation: `const cacheKey = generateCacheKey(titleStr, locationStr, countryCode, categoryStr);`.
  - Update Nitro `defineCachedFunction` `getKey` memoizer to include `categoryStr`.
  - Pass `category` in Adzuna histogram params (`params.category = categoryStr`) and to `executeMarketFallback`.
  - When `categoryStr` is provided, assign `categoryTag = categoryStr` for direct TTL lookup without needing to read `adzuna_jobs_cache`.
  - Update unit tests in `server/api/market-data/tests/salary.spec.ts` verifying category query handling, cache hit/miss behavior, and Adzuna/fallback calls.

## 3. Client Composables & Routing Integration

- [ ] 3.1 Update `app/composables/useJobs.ts`:
  - Update `fetchJobs` and `fetchHistogram` method signatures to accept `category?: string`.
  - Include `category` in `$fetch` params to `/api/market-data/jobs` and `/api/market-data/salary`.
  - Update unit tests in `app/composables/tests/useJobs.spec.ts` to verify category param passing and category state resets.
- [ ] 3.2 Update `app/composables/useLocationEngine.ts`:
  - Extract `category` (or `industry`) from `route.query`.
  - Pass `category` into `adzuna.fetchJobs` and `adzuna.fetchHistogram`.
  - Update unit tests in `app/composables/tests/useLocationEngine.spec.ts` to verify category query extraction and forwarding.

## 4. UI & Internationalization

- [ ] 4.1 Add i18n translation keys:
  - Add `search.industry.label`, `search.industry.placeholder`, `search.industry.helper` to `i18n/locales/en-GB/search.json`.
  - Add `search.industry.label`, `search.industry.placeholder`, `search.industry.helper` to `i18n/locales/en-US/search.json`.
- [ ] 4.2 Update `app/components/BaseSearchForm.vue`:
  - Add an optional Industry select dropdown using `AmIInputSelect` (`single: true`, `optional: true`), defaulting to empty/null.
  - Sourced exclusively from `useJobs().categories` and `useJobs().fetchCategories(activeCountry)` (backed by `/api/market-data/categories`), dynamically re-fetching when `activeCountry` changes.
  - Include selected category tag in the route query parameters upon form submission (`handleSearch` -> `executeNavigation`).
- [ ] 4.3 Update search logging in `app/composables/useUserLogging.ts` / `server/api/user/track-search.post.ts` to optionally record `category` if provided. Update unit tests in `server/api/user/tests/track-search.spec.ts` and `app/composables/tests/useUserLogging.spec.ts`.

## 5. Verification & Quality Gate

- [ ] 5.1 Run full verification suite `pnpm test:verify` (combines linting, typechecking, 80% per-file test coverage, e2e tests, and firestore rules tests) and verify all checks pass with zero errors.
