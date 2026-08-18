## MODIFIED Requirements

### Requirement: Reed API Job Data Fetching

The system SHALL fetch active job vacancies from the Reed.co.uk API using the provided job title and location, primarily acting as the fallback for UK traffic.

#### Scenario: Successful job data retrieval

- **WHEN** the system requests jobs with a valid title and location for the UK region
- **THEN** it SHALL return a list of job objects containing `minimumSalary` and `maximumSalary`.

### Requirement: Server-Side Statistical Calculation

Since the Reed API does not provide pre-calculated histograms, the system SHALL calculate the necessary statistics (mean, average, percentiles) and generate a histogram structure from the aggregated minimum and maximum salaries of the fetched jobs.

#### Scenario: Calculating histogram and mean

- **WHEN** job data is successfully fetched from Reed
- **THEN** the system SHALL calculate the mean salary and generate histogram buckets to match the application's required `HistogramData` format.

## ADDED Requirements

### Requirement: Geographic API Routing

The `market-data` API Gateway SHALL route job and salary requests dynamically based on the target region:

- UK Traffic: Routes primarily to Reed API, falling back to Adzuna on zero results or API failure.
- USA Traffic: Routes primarily to Adzuna API, falling back to Jooble on zero results or API failure.

#### Scenario: USA Geographic Routing

- **WHEN** a user requests market data for the USA
- **THEN** the system SHALL attempt to fetch from Adzuna first, and if 0 results are returned, fallback to the Jooble API.
