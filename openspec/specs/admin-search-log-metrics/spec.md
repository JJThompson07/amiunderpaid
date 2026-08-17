# admin-search-log-metrics Specification

## Purpose

Defines the metrics and capabilities for the admin search log dashboard.

## Requirements

### Requirement: Admin Search Log Enrichment

The system SHALL capture post-search metrics (MCA score, market average, government average, and data provider) and associate them with the original search log event. The system SHALL also track whether the search yielded results using a `search_success` boolean flag.

#### Scenario: User completes a successful search

- **WHEN** a user initiates a salary search and successfully navigates to the results page with data
- **THEN** the system updates their search log entry in Firestore with the calculated `MCA_score`, `market_average`, `government_average`, and the `provider` (e.g. 'adzuna' or 'reed') values.
- **AND** sets `search_success: true`.

#### Scenario: User completes a search with no results

- **WHEN** a user initiates a salary search but the results page yields no data (empty state)
- **THEN** the system updates their search log entry setting `search_success: false`.

### Requirement: Admin Search Log Display

The admin dashboard search logs table SHALL display the enriched post-search metrics and data provider for all searches where the data is available.

#### Scenario: Admin views the search logs

- **WHEN** an administrator visits `/admin/search-logs`
- **THEN** the table displays columns for MCA Score, Market Average, Gov Average, and Provider.
- **AND** searches lacking this data gracefully display a dash (-) or "N/A".

### Requirement: Historical Search Backfill

The admin dashboard SHALL provide a mechanism to retroactively backfill historical search logs that are missing metrics by utilizing cached data and APIs.

#### Scenario: Admin initiates backfill

- **WHEN** an administrator clicks the "Backfill Historical" button on the search logs page
- **THEN** the system iterates through historical searches missing an MCA score
- **AND** recalculates the values using cached Adzuna and Government data
- **AND** updates the records with the calculated metrics along with the flag `historical_fetched_MCA: true`.

### Requirement: Search logs endpoint is secured
The API endpoint that serves search logs for the admin dashboard SHALL be strictly authenticated and authorized, preventing public access to sensitive user data.

#### Scenario: Anonymous user requests search logs
- **WHEN** an unauthenticated request is made to fetch the search logs
- **THEN** the system rejects the request with a 401 Unauthorized or 403 Forbidden error

#### Scenario: Admin views the search logs
- **WHEN** an authenticated admin requests the search logs for the dashboard
- **THEN** the system securely returns the log data
