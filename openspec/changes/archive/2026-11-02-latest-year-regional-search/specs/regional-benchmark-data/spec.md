## ADDED Requirements

### Requirement: Search holds one regional year per country

The `regional_salary_benchmarks` search index SHALL hold only the newest regional data year per country, while Firestore keeps every year, so the search index stays within its record quota as new years are added.

#### Scenario: A new regional year is added

- **WHEN** 2026 regional data is synced for a country that already had 2025 regional data in search
- **THEN** the search index holds only that country's 2026 regional records, and lookups behave as defined by "One data year per result"
