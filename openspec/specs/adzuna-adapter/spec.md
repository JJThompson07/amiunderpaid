# adzuna-adapter Specification

## Purpose

Defines the standard adapter pattern for querying Adzuna market data APIs.

## Requirements

### Requirement: Adzuna API Location Adapter

The server-side Adzuna API routes (`server/api/adzuna/jobs.ts` and `server/api/adzuna/salary.ts`) and utility fetchers (`server/utils/adzuna.ts`) SHALL intercept incoming location parameters and translate URL-friendly internal slugs to official Adzuna location strings using a constant mapping map before sending the HTTP request. All outbound HTTP requests to the Adzuna API SHALL enforce an explicit timeout of 6,000 milliseconds (6 seconds) to prevent serverless function hangs and ensure prompt failover on downstream latency.

#### Scenario: Translating an internal slug to an Adzuna string

- **WHEN** the API route receives a `location` query parameter such as "east"
- **THEN** it SHALL map it to "East of England" before appending it to the `where` parameter in the outbound Adzuna API request.

#### Scenario: Fallback for unmapped locations

- **WHEN** the API route receives a `location` query parameter that does not exist in the mapping map (e.g., "Manchester")
- **THEN** it SHALL use the provided string directly as the `where` parameter in the outbound Adzuna API request.

#### Scenario: Upstream request timeout triggers fallback

- **WHEN** the Adzuna API does not respond within 6,000 milliseconds
- **THEN** the request SHALL abort with a timeout error, enabling the market data gateway to fail over to the regional secondary provider.

### Requirement: Reed API Fallback on Adzuna Limit

The server-side market data API routes (`server/api/market-data/jobs.ts` and `server/api/market-data/salary.ts`) SHALL utilize Adzuna as the fallback provider for UK traffic when Reed yields zero results or fails, and as the primary provider for USA traffic with Jooble fallback.

#### Scenario: Adzuna rate limit exceeded

- **WHEN** the Adzuna API responds with a 429, 403, or quota exceeded error during a USA request
- **THEN** the system SHALL automatically query the Jooble API, process the results to match the expected format, and return them to the client.

#### Scenario: Adzuna serves as UK fallback

- **WHEN** a UK market data query produces zero results or encounters an error from Reed
- **THEN** the system SHALL automatically query Adzuna API, format the results, and return them with `provider: 'adzuna'`.

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
