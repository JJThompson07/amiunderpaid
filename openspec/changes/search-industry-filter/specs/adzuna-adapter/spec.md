## ADDED Requirements

### Requirement: Adzuna API Category Filter and Cache Isolation

The server-side market data routes (`server/api/market-data/jobs.ts` and `server/api/market-data/salary.ts`) SHALL accept an optional `category` query parameter, include it in outbound Adzuna API calls, incorporate it into cache key calculations, and record it under `searchParams.category` in Firestore cache documents without disrupting the derived `categoryTag` used for cache-TTL lookups.

#### Scenario: Querying Adzuna with category filter
- **WHEN** the market-data endpoint receives a `category` query parameter (e.g., `it-jobs`)
- **THEN** it SHALL include `category=it-jobs` in the outbound request to Adzuna search (`/search/1`) and histogram (`/histogram`) endpoints.

#### Scenario: Cache key isolation with category
- **WHEN** cache keys are computed via `generateCacheKey` and Nitro's memory cache `getKey`
- **THEN** searches for the same title with different or null categories SHALL generate distinct cache keys.

#### Scenario: Preserving derived categoryTag for cache TTL
- **WHEN** a cached market-data document is written to `adzuna_jobs_cache` or `adzuna_distribution_cache`
- **THEN** the document SHALL record the filter parameter under `searchParams.category` while maintaining `categoryTag` (derived from results or explicit category) for TTL lookup against `adzuna_category`.
