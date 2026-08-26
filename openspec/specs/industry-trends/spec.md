## Purpose

Implement the "Industry Trends" feature, allowing users to view a macro-level historical graph of average salaries across various industries over time, powered by Adzuna's historical data API.

## Requirements

### Requirement: Industry Trends Page

The system SHALL provide a dedicated page (`/insights/industry-trends`) featuring a large time-series graph as its centerpiece.

#### Scenario: User navigates to Industry Trends

- **WHEN** the user visits `/insights/industry-trends`
- **THEN** they see an ECharts line graph plotting average salaries over the last 12 months for multiple industries.

### Requirement: Graph Controls

The system SHALL provide interactive controls allowing the user to filter the graph.

#### Scenario: User toggles industries

- **WHEN** the user interacts with the graph controls (toggles, Select All, Clear All, or time range selectors)
- **THEN** the graph dynamically updates to show or hide the selected industries and adjusts the time window accordingly.

### Requirement: Historical Data Storage

The system SHALL persist historical average salary data in Firestore to minimize external API calls.

#### Scenario: Admin triggers backfill sync

- **WHEN** the initial sync is executed
- **THEN** the system fetches 12 months of historical data from Adzuna for all tracked categories and saves it to the `adzuna_industry_trends` collection.

#### Scenario: Monthly delta sync

- **WHEN** the sync is executed on the 1st of a new month
- **THEN** the system only fetches and appends the latest month's data, strictly making 1 API call per tracked category per country.
