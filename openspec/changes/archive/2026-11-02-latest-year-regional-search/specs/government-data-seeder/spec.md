## ADDED Requirements

### Requirement: Search keeps only the newest regional year

After a regional dataset is written to Firestore and synced to the `regional_salary_benchmarks` search index, the seeder SHALL remove that country and period's older years from the search index only. Firestore SHALL keep every year. The seeder SHALL NOT sync a regional year older than the newest regional year already in Firestore for that country to the search index. National datasets SHALL keep every year in search.

#### Scenario: Uploading the newest regional year

- **WHEN** an admin syncs USA 2026 regional records while Firestore also holds USA 2025 regional records
- **THEN** the 2026 records are written to Firestore and search, then records matching `country:USA AND period:year AND year < 2026` are removed from the search index, and the 2025 documents stay in Firestore

#### Scenario: Uploading an older regional year

- **WHEN** an admin syncs UK 2024 regional records while Firestore holds UK 2026 regional records
- **THEN** the 2024 records are written to Firestore only, and the console says search keeps the newest year

#### Scenario: Pruning fails

- **WHEN** the search sync succeeds but removing older years errors
- **THEN** the console shows a warning and the sync is still reported as complete

#### Scenario: National uploads keep every year

- **WHEN** an admin syncs UK 2026 national records
- **THEN** no older national years are removed from search

#### Scenario: Deleting the newest regional year

- **WHEN** an admin deletes the newest regional year for a country
- **THEN** the console warns that search has no regional data for that country until a year is synced again
