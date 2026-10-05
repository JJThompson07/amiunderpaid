## MODIFIED Requirements

### Requirement: Historical Data Storage

The system SHALL persist historical average salary data in Firestore to minimize external API calls, syncing every category Adzuna tracks for each supported country regardless of recent search activity.

#### Scenario: Admin triggers backfill sync

- **WHEN** the initial sync is executed
- **THEN** the system fetches 12 months of historical data from Adzuna for every category returned by Adzuna's category-taxonomy endpoint for each tracked country, and saves it to the `adzuna_industry_trends` collection.

#### Scenario: Monthly delta sync

- **WHEN** the sync is executed on the 1st of a new month
- **THEN** the system fetches and appends the latest month's data for every category returned by Adzuna's category-taxonomy endpoint for each tracked country, strictly making 1 API call per category per country.

#### Scenario: A category has no recent search activity

- **WHEN** a tracked category has had no live job-search traffic recorded recently
- **THEN** the sync still fetches and stores its latest historical data point, exactly as it would for a high-traffic category — sync coverage SHALL NOT depend on recent search-cache (`adzuna_jobs_cache`) activity.
