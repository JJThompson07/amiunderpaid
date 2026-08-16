## MODIFIED Requirements

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
