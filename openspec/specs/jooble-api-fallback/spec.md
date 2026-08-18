# jooble-api-fallback Specification

## Purpose

Provides a fallback mechanism using the Jooble API to serve job data when the primary USA provider fails or returns zero results.

## Requirements

### Requirement: Jooble API Job Data Fetching

The system SHALL fetch active job vacancies from the Jooble API using the provided job title and location.

#### Scenario: Successful job data retrieval

- **WHEN** the system requests jobs with a valid title and location in the USA region
- **THEN** it SHALL return a list of job objects matching the internal MarketJob interface.

### Requirement: Jooble Salary Parsing

The system SHALL parse the unstructured `salary` string provided by Jooble and normalize it into numeric `minimumSalary` and `maximumSalary` values while preserving the original string as `raw_salary`.

- If the string is a range (e.g., "$97k - $206k"), the system SHALL use the top/maximum value.
- If the string indicates a monthly value (e.g., "$5,000 per month"), the system SHALL multiply it to derive the annual equivalent.
- If the string is a single annual value (e.g., "$200k"), it SHALL be normalized to a standard numeric format.

#### Scenario: Normalizing various Jooble salary strings

- **WHEN** the Jooble API returns a job with a string `salary` field
- **THEN** the system SHALL successfully extract the numeric annual equivalent and map it to the internal format.

### Requirement: Server-Side Statistical Calculation for Jooble

The system SHALL calculate necessary statistics (mean, percentiles, histograms) dynamically from the fetched Jooble jobs, as Jooble does not provide pre-calculated histograms natively.

#### Scenario: Calculating histogram and mean for USA fallback

- **WHEN** job data is successfully fetched from Jooble
- **THEN** the system SHALL calculate the mean salary and generate histogram buckets to match the application's required `HistogramData` format.
