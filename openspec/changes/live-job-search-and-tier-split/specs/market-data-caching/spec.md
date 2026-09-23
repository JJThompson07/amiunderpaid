# Spec Delta: market-data-caching

## MODIFIED Requirements

### Requirement: Cache Key Versioning & Stale Provider Invalidation

The market-data cache layer SHALL prefix cache keys with a version identifier (`v2-`), harmonize the document key format across `/api/market-data/jobs` and `/api/market-data/salary`, and store full dual-tier result payloads (up to 100 listings) in `adzuna_jobs_cache` so that searches conducted via the job search page (`/jobs/...`) or salary search page (`/salary/...`) mutually warm and reuse the same Firestore cache document without redundant external API requests.

#### Scenario: Versioned cache key generation
- **WHEN** `generateCacheKey` is invoked for a search query
- **THEN** it SHALL prefix the resulting key with `v2-`, isolating fresh search results from legacy unversioned cache entries.

#### Scenario: Harmonized cache key lookup across endpoints
- **WHEN** a job search request is executed on `/api/market-data/jobs` for a given title, location, country, jobType, contractType, and category
- **THEN** it SHALL write the result payload to `adzuna_jobs_cache` with key `${generateCacheKey(title, location, country, category)}-${jobType}-${contractType}`
- **AND** a subsequent request to `/api/market-data/salary` for the same parameters SHALL read and reuse the histogram and provider data from that exact document key without making upstream API requests.

#### Scenario: Full result retention in jobs cache
- **WHEN** provider data with up to 100 listings across Tier 1 and Tier 2 is retrieved
- **THEN** `adzuna_jobs_cache` SHALL persist all retrieved results (both `results` and `similarResults`) rather than slicing to 10 prior to Firestore persistence.

#### Scenario: Invalidation of stale UK provider entries
- **WHEN** a UK market-data request (`country: gb`) reads a cached document where `provider !== 'reed'`
- **THEN** the system SHALL treat the entry as a cache miss, immediately fetch fresh data from the Reed API, and overwrite the cached document.
