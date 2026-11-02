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
