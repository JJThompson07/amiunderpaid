## Context

`BaseSearchForm.vue` currently provides search inputs for job title, contract time (`full-time`, `part-time`, `all`), contract type (`permanent`, `contract`, `all`), location, and salary. When submitted, the form serializes parameters into route query parameters (`schedule`, `contract`, `compare`, `period`) and navigates to the result routes (`/salary/[title]/[country]/[[location]]` or `/benchmark/[title]/[country]/[[location]]`).

On the results page, `useLocationEngine` extracts query parameters and triggers `useJobs` methods (`fetchJobs`, `fetchHistogram`), which invoke the Nitro backend gateway routes (`server/api/market-data/jobs.ts` and `server/api/market-data/salary.ts`).

Currently, no industry filter exists on the search form, and queries to Adzuna and the fallback providers (Reed and Jooble) do not support industry scoping.

## Goals / Non-Goals

**Goals:**

- Add an optional Industry select dropdown to `BaseSearchForm.vue` that defaults to null/empty ("All Industries") without impeding form submission.
- Source category options exclusively from `useJobs().fetchCategories(country)` / `/api/market-data/categories` (Adzuna's complete country-scoped category catalog), dynamically re-fetching on region switches in benchmark mode.
- Propagate the selected industry tag across navigation query parameters (`?category=...`), client composables (`useJobs`, `useLocationEngine`), and Nitro gateway routes (`jobs.ts`, `salary.ts`).
- Update cache key generation (`server/utils/adzuna.ts`) and Nitro memory cache keys (`getKey` in `defineCachedFunction`) to ensure independent caching for industry-filtered searches.
- Maintain clear separation between the user-supplied filter parameter (`searchParams.category`) and the existing derived `categoryTag` (used for cache-TTL lookups in the `adzuna_category` Firestore collection).
- Forward industry filters natively to Adzuna (`category` parameter) and via keyword enhancement to fallback providers (Reed and Jooble) through `server/utils/fallback.ts`.

**Non-Goals:**

- Rendering historical trend charts on results pages (deferred to future scope).
- Modifying government benchmark SOC taxonomy matching (`uk_job_groups`/`usa_job_groups`).

## Decisions

### 1. UI Component & Dropdown Integration

- **Decision**: Integrate `AmIInputSelect` with `single: true` and `optional: true` into `BaseSearchForm.vue`.
- **Rationale**: `AmIInputSelect` provides built-in search filtering, optional badges, clearing, and keyboard navigation while conforming to the existing design system.
- **Alternatives Considered**: Native HTML `<select>` (lacks searchable filtering and consistent styling) or `AmITabs` (infeasible given 20+ categories).

### 2. Category Options Sourcing

- **Decision**: Source industry categories exclusively from `useJobs().categories` and `useJobs().fetchCategories(country)` (calling `/api/market-data/categories`).
- **Rationale**: `/api/market-data/categories` is a direct live pass-through to Adzuna's `/categories` endpoint, returning the full `{ tag, label }` taxonomy for the specified country (`gb` / `us`). In contrast, `useIndustryTrends` reads from Firestore `adzuna_industry_trends`, which is a curated, popularity-gated subset (lookupCount-filtered) built specifically for trend charts. Using `useIndustryTrends` would erroneously omit valid niche industries.
- **Alternatives Considered**: `useIndustryTrends` (rejected: excludes categories below lookup thresholds) or static JSON (rejected: risks drift from live provider taxonomy).

### 3. Separation of Search Filter `category` vs Cache TTL `categoryTag`

- **Decision**: Clearly distinguish between:
  1. **Search Filter Input (`categoryStr`)**: The optional query parameter sent by the client, stored in `searchParams.category` in cache documents, and passed to `generateCacheKey`.
  2. **Cache Expiration Metadata (`categoryTag`)**: The top-level string field stored on the cache document and used to query `db.collection('adzuna_category').doc(categoryTag)` for per-category cache-TTL overrides (`catSnap.data()?.cache || 30`).
- **Rationale**: In `jobs.ts` and `salary.ts`, `categoryTag` is existing infrastructure for TTL resolution. When an explicit category filter is provided, `categoryTag` is set to that tag (or falls back to `cleanData.results?.[0]?.category?.tag || 'unknown'`), ensuring TTL lookups continue working seamlessly without corrupting cache document schemas.

### 4. Cache Key & Memory Cache Isolation

- **Decision**: Update `generateCacheKey` in `server/utils/adzuna.ts`:
  ```typescript
  export const generateCacheKey = (
    title: string,
    location: string,
    country: string,
    category?: string
  ): string => {
    const t = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9+#.]+/g, '-');
    const l = location
      ? location
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9+#.]+/g, '-')
      : '';
    const c = category
      ? category
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9+#.]+/g, '-')
      : '';

    const rawKey = c ? `${country}-${l}-${t}-cat-${c}` : `${country}-${l}-${t}`;

    if (rawKey.length > 200) {
      const hash = crypto.createHash('sha256').update(rawKey).digest('hex').substring(0, 16);
      return `${rawKey.substring(0, 180)}-${hash}`;
    }

    return rawKey;
  };
  ```
  - **Splice Point in `jobs.ts`**:
    `const cacheKey = `${generateCacheKey(titleStr, locationStr, countryCode, categoryStr)}-${typeStr}-${contractStr}-${limit}`;`
    `fetchFromProviders` `getKey`: includes `categoryStr`.
  - **Splice Point in `salary.ts`**:
    `const cacheKey = generateCacheKey(titleStr, locationStr, countryCode, categoryStr);`
    `fetchFromProviders` `getKey`: includes `categoryStr`.
- **Rationale**: Eliminates cache collision between generic searches and industry-filtered searches in both Firestore and Nitro's memory cache.

### 5. Multi-Provider Query Strategy

- **Decision**:
  - **Adzuna**: Pass the native `category` query param directly to `/search/1` and `/histogram`.
  - **Reed (UK Fallback)**: Reed's API accepts `keywords`, `resultsToTake`, `locationName`, `fullTime`, `partTime`, `permanent`, `contract`, `temp` without an Adzuna category taxonomy. When fallback is triggered, `fetchReedData` receives `category?: string` and enhances `keywords` with the human-readable category keyword (e.g. `${title} ${cleanCategory}`).
  - **Jooble (USA Fallback)**: Jooble's API body accepts `{ keywords, location, page }` without an Adzuna category taxonomy. When fallback is triggered, `fetchJoobleData` receives `category?: string` and enhances `keywords` with the category term.
  - **Fallback Gateway (`server/utils/fallback.ts`)**: `executeMarketFallback(title, location, countryCode, type, contract, category?)` forwards `category` to `fetchReedData` and `fetchJoobleData`.
- **Rationale**: Concrete, deterministic fallback behavior that leverages industry intent across all providers without relying on nonexistent vendor parameters.

## Risks / Trade-offs

- **[Risk: Category Options Fetch Overhead]** → _Mitigation_: `fetchCategories` calls `/api/market-data/categories`, which is fast and non-blocking. The industry select defaults to unselected and form submission is never blocked if categories are loading.
- **[Risk: Cache Collision / Schema Drift]** → _Mitigation_: Explicitly test `generateCacheKey` with unit tests covering empty, null, and populated category strings; store `searchParams.category` cleanly alongside `categoryTag`.
