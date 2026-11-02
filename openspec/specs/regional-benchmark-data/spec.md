# regional-benchmark-data Specification

## Purpose

Defines the completeness and determinism requirements for the UK regional benchmark query that `microRegionalData` depends on.

## Requirements

### Requirement: UK regional query returns all matching regions

The UK regional benchmark query in `useMicroData` SHALL retrieve every region matching the current occupation and category filter, not an arbitrary subset. `useMicroData` and `useMacroData` SHALL use a consistent page size against the shared regional Algolia index, or any deliberate difference SHALL be documented in a code comment explaining why.

#### Scenario: Occupation present in more than 100 UK regions

- **WHEN** a UK user searches an occupation that has data in more than 100 of the ~400 ONS regions in `utils/locations/uk.ts`
- **THEN** `microRegionalData` SHALL include the result for the user's own region if it exists in the index, deterministically across repeated requests

#### Scenario: Regional data exists for a low-population region

- **WHEN** a UK user in a low-population region searches a common occupation
- **THEN** the system SHALL return that region's data rather than silently falling back to normalised national data

### Requirement: One data year per result

When the benchmark indices hold more than one data year, each lookup SHALL use exactly one data year: national lookups SHALL use the newest year's record, and regional data SHALL be restricted to that same year (or, with no national record, the newest regional year present). A single result SHALL never mix figures from different years.

#### Scenario: National lookup with two years indexed

- **WHEN** `salary_benchmarks` holds both 2025 and 2026 records for the same UK occupation
- **THEN** the national benchmark shown is the 2026 record, on every request

#### Scenario: Regional lookup with two years indexed

- **WHEN** `regional_salary_benchmarks` holds both 2025 and 2026 records for the same UK region
- **THEN** that region's entry in the regional data map is the 2026 record, regardless of which year's hit appears later in the response

#### Scenario: A region has no figure for the newest year

- **WHEN** the national record for an occupation is 2026 and a region only has a 2025 record for it
- **THEN** that region is left out of the regional data rather than showing its 2025 value beside 2026 figures, and the user's own region falls back exactly as it would with no regional data

#### Scenario: Regional upload lags the national upload

- **WHEN** national 2026 records are indexed but regional records are still only 2025
- **THEN** no regional data is shown until the regional 2026 records are uploaded, rather than mixing 2026 national with 2025 regional figures

### Requirement: Search holds one regional year per country

The `regional_salary_benchmarks` search index SHALL hold only the newest regional data year per country, while Firestore keeps every year, so the search index stays within its record quota as new years are added.

#### Scenario: A new regional year is added

- **WHEN** 2026 regional data is synced for a country that already had 2025 regional data in search
- **THEN** the search index holds only that country's 2026 regional records, and lookups behave as defined by "One data year per result"
