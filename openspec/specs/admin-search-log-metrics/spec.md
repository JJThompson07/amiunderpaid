# admin-search-log-metrics Specification

## Purpose

TBD - created by archiving change admin-search-log-update. Update Purpose after archive.

## Requirements

### Requirement: Admin Search Log Enrichment

The system SHALL capture post-search metrics (MCA score, market average, and government average) and associate them with the original search log event. The system SHALL also track whether the search yielded results using a `search_success` boolean flag.

#### Scenario: User completes a successful search

- **WHEN** a user initiates a salary search and successfully navigates to the results page with data
- **THEN** the system updates their search log entry in Firestore with the calculated `MCA_score`, `market_average`, and `government_average` values.
- **AND** sets `search_success: true`.

#### Scenario: User completes a search with no results

- **WHEN** a user initiates a salary search but the results page yields no data (empty state)
- **THEN** the system updates their search log entry setting `search_success: false`.

### Requirement: Admin Search Log Display

The admin dashboard search logs table SHALL display the enriched post-search metrics for all searches where the data is available.

#### Scenario: Admin views the search logs

- **WHEN** an administrator visits `/admin/search-logs`
- **THEN** the table displays columns for MCA Score, Market Average, and Gov Average
- **AND** searches lacking this data gracefully display a dash (-) or "N/A".

### Requirement: Historical Search Backfill

The admin dashboard SHALL provide a mechanism to retroactively backfill historical search logs that are missing metrics by utilizing cached data and APIs.

#### Scenario: Admin initiates backfill

- **WHEN** an administrator clicks the "Backfill Historical" button on the search logs page
- **THEN** the system iterates through historical searches missing an MCA score
- **AND** recalculates the values using cached Adzuna and Government data
- **AND** updates the records with the calculated metrics along with the flag `historical_fetched_MCA: true`.
