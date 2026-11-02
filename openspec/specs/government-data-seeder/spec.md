# government-data-seeder Specification

## Purpose

Defines how the admin Government Data Seeder (`/admin/seed`) lists, uploads and deletes government salary benchmark datasets (ONS ASHE, BLS OEWS) in `salary_benchmarks` and `regional_salary_benchmarks`.

## Requirements

### Requirement: Seeder lists existing benchmark datasets

The admin seeder SHALL show every government benchmark dataset currently stored, grouped by scope (national/regional), country, year and period with its record count, loaded through an admin-verified server endpoint rather than client Firestore reads.

#### Scenario: Existing data is shown

- **WHEN** an admin opens `/admin/seed` and `salary_benchmarks` holds UK 2025 `year`-period records
- **THEN** the "Current Database Records" panel lists `UK | 2025 | YEAR | NATIONAL` with the stored count

#### Scenario: Summary fails to load

- **WHEN** the summary endpoint errors
- **THEN** the seeder logs the failure to its processing console instead of silently rendering an empty panel, and the endpoint's error message names no internal collection or provider

### Requirement: Seeder can upload and delete benchmark datasets

The generic admin seed and delete endpoints SHALL accept `salary_benchmarks` and `regional_salary_benchmarks`, while continuing to reject collections outside their allow-lists, and delete SHALL still require non-empty filters.

#### Scenario: Uploading a new year

- **WHEN** an admin parses and syncs a UK 2026 national spreadsheet
- **THEN** the records are written to `salary_benchmarks` and synced to the matching Algolia index, alongside any existing 2025 records

#### Scenario: Deleting a dataset

- **WHEN** an admin confirms deletion of `UK 2025 year National`
- **THEN** only documents matching `country: UK, year: 2025, period: year` are removed from `salary_benchmarks`

### Requirement: Seeder names the expected source spreadsheet

The seeder SHALL show which government spreadsheet the selected country and scope expect: ONS ASHE Table 14.7a (UK national), ONS ASHE Table 7.7a (UK regional), BLS OEWS national (USA national), BLS OEWS state/area (USA regional).

#### Scenario: Switching scope

- **WHEN** an admin selects UK and Regional
- **THEN** the seeder shows ONS ASHE Table 7.7a as the expected source
