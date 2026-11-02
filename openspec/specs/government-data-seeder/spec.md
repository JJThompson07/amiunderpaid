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

### Requirement: Large datasets upload in chunks

The seeder SHALL parse government spreadsheets in the browser and SHALL send parsed records to the server in chunks that each fit within the hosting platform's request-size limit, so a dataset of any size the browser can parse (including the ~36k-record BLS OEWS state/area file) can be uploaded.

#### Scenario: USA regional upload

- **WHEN** an admin parses and syncs the BLS OEWS state/area spreadsheet
- **THEN** no request carries the spreadsheet file, and every Firestore and search-index request carries at most one chunk of records

#### Scenario: A chunk fails mid-upload

- **WHEN** one chunk of a multi-chunk sync fails
- **THEN** the seeder stops, logs how many records were written before the failure, keeps the parsed data, and running Sync again re-writes every record without creating duplicates

#### Scenario: Malformed spreadsheet

- **WHEN** the selected file lacks the expected ONS or BLS header structure
- **THEN** the seeder logs the parse error and nothing is sent to the server

### Requirement: Seeder reports parse and sync progress

The seeder SHALL summarise each parsed file (record count, occupations × locations, rows skipped for suppressed or missing medians) and SHALL show live per-step progress and duration while syncing, without adding a console line per chunk.

#### Scenario: Syncing a large dataset

- **WHEN** an admin syncs a multi-chunk dataset
- **THEN** a progress bar and a single updating console line show records written out of the total for the current step, and each step logs its duration on completion

### Requirement: Sync targets the parsed scope

The seeder SHALL write parsed records to the collection matching the scope they were parsed with, regardless of the scope toggle's state when Sync is clicked.

#### Scenario: Scope toggled after parsing

- **WHEN** an admin parses a national file, switches the toggle to Regional, then clicks Sync
- **THEN** the records are written to `salary_benchmarks`

### Requirement: Source codes are normalised on parse

The seeder SHALL store occupation and area codes without the text-forcing leading apostrophe some ONS releases include, so codes match the site's `id_code` lookups and the `job_titles` SOC codes.

#### Scenario: ONS 2026 code cells

- **WHEN** a UK spreadsheet row has the code `'2134`
- **THEN** the parsed record's `id_code` is `2134`

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
