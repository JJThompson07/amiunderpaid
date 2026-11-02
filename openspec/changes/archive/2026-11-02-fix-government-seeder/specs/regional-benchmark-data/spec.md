## ADDED Requirements

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
