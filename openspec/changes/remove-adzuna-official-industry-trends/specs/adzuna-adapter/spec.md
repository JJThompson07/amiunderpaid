## REMOVED Requirements

### Requirement: Adzuna API Location Adapter

**Reason:** Adzuna is completely removed from the platform because its terms require a commercial licence for revenue-generating use.

**Migration:** UK requests route exclusively to Reed (`REED_LOCATION_MAP`), and USA requests route to Careerjet with Jooble fallback.

### Requirement: Reed API Fallback on Adzuna Limit

**Reason:** Adzuna is no longer used as a primary or fallback provider in any region.

**Migration:** UK uses Reed only (falling back to ONS data when Reed fails or returns zero results). USA uses Careerjet as primary and Jooble as fallback (falling back to BLS data when both fail).

### Requirement: Adzuna API Category Filter and Cache Isolation

**Reason:** Outbound Adzuna search and histogram endpoints are removed, and `adzuna_categories` is replaced by the static SIC/NAICS taxonomy in `shared/utils/industries.ts`.

**Migration:** Category filtering for Reed, Careerjet, and Jooble uses keyword enhancement, and cache keys remain isolated by `category` in `market_jobs_cache` and `market_distribution_cache`.
