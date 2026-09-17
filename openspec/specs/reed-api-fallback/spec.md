# reed-api-fallback Specification

## Purpose

Provides a fallback mechanism using the Reed.co.uk Jobseeker API to serve job data and calculate salary statistics when primary providers fail.

## Requirements

### Requirement: Reed API Job Data Fetching

The system SHALL fetch active job vacancies from the Reed.co.uk API using the provided job title and location, primarily acting as the primary provider for UK traffic. The initial (Tier 1) query SHALL quote the full search title OR'd with the extracted anchor phrase (see `search-relevance-and-specificity`) — e.g. `"${title}" OR "${anchorPhrase}"` — for exact-phrase matching, or just the quoted full title alone when anchor extraction is a no-op, falling back to an unquoted full-title search when Tier 1 returns fewer than 3 relevant results with salaries.

#### Scenario: Successful job data retrieval

- **WHEN** the system requests jobs with a valid title and location for the UK region
- **THEN** it SHALL return a list of job objects containing `minimumSalary` and `maximumSalary`.

#### Scenario: Tier 1 combines the full title and anchor phrase via OR

- **WHEN** the search title is `"Group Head of Finance"` (anchor extraction yields `"Head of Finance"`, distinct from the full title)
- **THEN** the system SHALL query Reed with `keywords: '"Group Head of Finance" OR "Head of Finance"'`.

#### Scenario: Tier 1 search yields insufficient results

- **WHEN** the Tier 1 quoted search (full title, optionally OR'd with the anchor phrase) returns fewer than 3 relevant results with salaries
- **THEN** the system SHALL fall back to an unquoted search using the full original search title, applying the same relevance filter.

### Requirement: Server-Side Statistical Calculation

Since the Reed API does not provide pre-calculated histograms, the system SHALL calculate the necessary statistics (mean, average, percentiles) and generate a histogram structure from the aggregated minimum and maximum salaries of the fetched jobs.

#### Scenario: Calculating histogram and mean

- **WHEN** job data is successfully fetched from Reed
- **THEN** the system SHALL calculate the mean salary and generate histogram buckets to match the application's required `HistogramData` format.

### Requirement: Geographic API Routing

The `market-data` API Gateway SHALL route job and salary requests dynamically based on the target region:

- UK Traffic: Routes primarily to Reed API, falling back to Adzuna on zero results or API failure.
- USA Traffic: Routes primarily to Adzuna API, falling back to Jooble on zero results or API failure.

#### Scenario: UK Geographic Routing

- **WHEN** a user requests market data for the UK (`country: gb`)
- **THEN** the system SHALL attempt to fetch from Reed first, and if 0 relevant results are returned or the API fails, fall back to the Adzuna API.

#### Scenario: USA Geographic Routing

- **WHEN** a user requests market data for the USA (`country: us`)
- **THEN** the system SHALL attempt to fetch from Adzuna first, and if 0 results are returned or the API fails, fall back to the Jooble API.
