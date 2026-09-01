## Purpose

Implement the "Industry Trends" feature, allowing users to view a macro-level historical graph of average salaries across various industries over time, powered by Adzuna's historical data API.

## Requirements

### Requirement: Industry Trends Page

The system SHALL provide a dedicated page (`/insights/industry-trends`) featuring a large time-series graph as its centerpiece.

#### Scenario: User navigates to Industry Trends

- **WHEN** the user visits `/insights/industry-trends`
- **THEN** they see an ECharts line graph plotting average salaries over the last 12 months for multiple industries.

### Requirement: Graph Controls

The system SHALL provide interactive controls allowing the user to filter the graph, including a custom time-range selector that lets the user pick any from/to month within the actual available data span rather than only fixed presets.

#### Scenario: User toggles industries

- **WHEN** the user interacts with the graph controls (toggles, Select All, Clear All, or the time range selector)
- **THEN** the graph dynamically updates to show or hide the selected industries and adjusts the time window accordingly.

#### Scenario: User selects a custom time range

- **WHEN** the user drags either handle of the time-range slider to select a custom `[from, to]` month window
- **THEN** the graph's x-axis updates to show only months within that window, and the window's bounds span the full range of months present in the underlying data (not just the currently-visible industries), so toggling industries on or off does not change the selectable range.

#### Scenario: Page loads with no prior selection

- **WHEN** the user first visits the Industry Trends page
- **THEN** the time-range selector defaults to the most recent 12 months of available data, or the full available span if fewer than 12 months of data exist yet.

### Requirement: Historical Data Storage

The system SHALL persist historical average salary data in Firestore to minimize external API calls.

#### Scenario: Admin triggers backfill sync

- **WHEN** the initial sync is executed
- **THEN** the system fetches 12 months of historical data from Adzuna for all tracked categories and saves it to the `adzuna_industry_trends` collection.

#### Scenario: Monthly delta sync

- **WHEN** the sync is executed on the 1st of a new month
- **THEN** the system only fetches and appends the latest month's data, strictly making 1 API call per tracked category per country.

### Requirement: Rate-Limit-Safe Sync

The system SHALL keep Adzuna API usage within Adzuna's documented rate limits (25 requests/minute, 250/day, 1000/week, 2500/month) during every sync run, and SHALL NOT let one category's failure abort the rest of the batch.

#### Scenario: Sync spans more categories than the per-minute limit allows

- **WHEN** the sync runs across more category/country pairs than can complete within one minute at the documented per-minute limit
- **THEN** the system paces its Adzuna calls in bounded batches with a wait between batches, rather than firing all calls at once.

#### Scenario: A single category is rate-limited or fails

- **WHEN** Adzuna returns an HTTP 429 or another error for one category/country pair mid-sync
- **THEN** the system retries that call once after a short delay, and if it still fails, records it as failed and continues syncing the remaining pairs — the overall sync SHALL report a per-pair success/failure summary rather than aborting.

### Requirement: Automated Monthly Sync Trigger

The system SHALL trigger the monthly delta sync automatically, without requiring a human to manually call the admin endpoint each month.

#### Scenario: Scheduled trigger fires

- **WHEN** the 1st of the month arrives
- **THEN** a scheduled job calls the sync with a monthly delta (not a full backfill), authenticated by a dedicated secret rather than an admin user session (the trigger has no Firebase session available to it).

#### Scenario: Unauthenticated or incorrectly authenticated trigger request

- **WHEN** the sync-trigger endpoint receives a request without the correct secret
- **THEN** the system rejects it with 401 and does not run the sync.

### Requirement: Legend Color Consistency

The system SHALL give each industry a distinct, stable color that is identical between its chart line and its legend/toggle control, regardless of which other industries are currently shown or hidden.

#### Scenario: User toggles an industry on or off

- **WHEN** the user deselects one industry, changing which industries are currently visible
- **THEN** every other industry's chart-line color and legend-pill color remain unchanged.

#### Scenario: Many industries are tracked

- **WHEN** the number of tracked industries exceeds the number of the platform's existing semantic theme colors
- **THEN** the system still assigns each industry a distinct, accessible color (not neon, not washed-out) rather than repeating colors across different industries.
