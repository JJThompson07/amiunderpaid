## ADDED Requirements

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
