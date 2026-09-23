## ADDED Requirements

### Requirement: Per-category cache duration is sourced from a single canonical collection and document ID

The market-data endpoints (`server/api/market-data/jobs.ts`, `server/api/market-data/salary.ts`) SHALL read the per-category `cacheDays` override from the `adzuna_categories` collection, using a document ID of `${countryLabel}-${categoryTag}` (lowercased, where `countryLabel` is `UK` or `USA`) — matching exactly the collection and document ID that the admin category-management UI (`/admin/adzuna`) writes. No code path SHALL read a per-category `cacheDays` override from any other collection name or an un-prefixed document ID.

#### Scenario: Primary-provider path resolves an admin-configured override

- **WHEN** a market-data request is fulfilled by the regional primary provider (Reed for UK, Adzuna for USA) for a category with a matching `{countryLabel}-{categoryTag}` document in `adzuna_categories`
- **THEN** the cached document's `expiresAt` is set to now plus that category document's `cache` field value, not the hardcoded 30-day default.

#### Scenario: The same category tag in different countries resolves independent overrides

- **WHEN** a category tag exists as both a UK document (`uk-{tag}`) and a USA document (`usa-{tag}`) in `adzuna_categories` with different `cache` values
- **THEN** a UK market-data request resolves only the `uk-{tag}` document's `cache` value, and a USA request resolves only the `usa-{tag}` document's `cache` value.

#### Scenario: Legacy pre-expiresAt fallback path resolves the same collection and document ID

- **WHEN** the system evaluates a legacy cached document that predates the `expiresAt` field and needs to look up a per-category override
- **THEN** it queries the same `adzuna_categories` collection and `${countryLabel}-${categoryTag}` document ID format used by the primary-provider path and the admin UI.

### Requirement: Saving a category's cache duration retroactively re-expires already-cached documents

WHEN an admin updates a category's `cache` value via `/admin/adzuna` and saves it, the system SHALL, in addition to persisting the new value on the category document, recompute `expiresAt` on already-cached documents in `adzuna_jobs_cache` and `adzuna_distribution_cache` that match that category's tag AND country, so that previously-cached results reflect the new duration without waiting for a natural cache miss to refresh them. Updates SHALL be scoped to the edited category's own country (Reed/UK categories SHALL NOT affect Adzuna/USA-cached documents sharing the same category tag, and vice versa) and SHALL be committed in batches of at most 500 documents per Firestore commit, consistent with the batching convention used by the existing cache-purge cron job.

#### Scenario: Admin lowers a UK category's cache duration

- **WHEN** an admin changes a UK category's `cache` value from 30 to 1 and saves
- **THEN** all `adzuna_jobs_cache` and `adzuna_distribution_cache` documents tagged with that category and `country: gb` have their `expiresAt` recomputed to no later than now plus 1 day
- **AND** documents for the same category tag under `country: us` are left unchanged.

#### Scenario: Retroactive update is batched

- **WHEN** more than 500 cached documents match an edited category and country
- **THEN** the system commits the `expiresAt` updates in batches of at most 500 documents per Firestore commit.
