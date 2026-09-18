# jooble-api-fallback Specification

## Purpose

Provides a fallback mechanism using the Jooble API to serve job data when the primary USA provider fails or returns zero results.

## Requirements

### Requirement: Jooble API Job Data Fetching

The system SHALL fetch active job vacancies from the Jooble API using the extracted anchor phrase (see `search-relevance-and-specificity`) as the `keywords` query, not the full raw search title, and the provided location.

#### Scenario: Successful job data retrieval

- **WHEN** the system requests jobs with a valid title and location in the USA region
- **THEN** it SHALL return a list of job objects matching the internal MarketJob interface.

#### Scenario: Querying with the anchor phrase rather than the full title

- **WHEN** the search title is `"Group Head of Finance"` (anchor extraction yields `"Head of Finance"`)
- **THEN** the system SHALL query Jooble with `keywords: "Head of Finance"`, not `"Group Head of Finance"`.

### Requirement: Jooble Salary Parsing

The system SHALL parse the unstructured `salary` string provided by Jooble and normalize it into numeric `minimumSalary` and `maximumSalary` values while preserving the original string as `raw_salary`.

- If the string is a range (e.g., "$97k - $206k"), the system SHALL use the top/maximum value.
- If the string indicates a monthly value (e.g., "$5,000 per month"), the system SHALL multiply it to derive the annual equivalent.
- If the string is a single annual value (e.g., "$200k"), it SHALL be normalized to a standard numeric format.

#### Scenario: Normalizing various Jooble salary strings

- **WHEN** the Jooble API returns a job with a string `salary` field
- **THEN** the system SHALL successfully extract the numeric annual equivalent and map it to the internal format.

### Requirement: Server-Side Statistical Calculation for Jooble

The system SHALL calculate necessary statistics (mean, percentiles, histograms) dynamically from the fetched Jooble jobs, as Jooble does not provide pre-calculated histograms natively. When the histogram is requested independently of the job-listing search (e.g. via `server/api/market-data/salary.ts`), the system SHALL derive it from the same job-search response already fetched and cached for the equivalent job-listing request (`server/api/market-data/jobs.ts`) rather than issuing a second, independent Jooble API call for the same search. A live Jooble call SHALL only be made when no fresh cached job-search response exists for the equivalent request.

#### Scenario: Calculating histogram and mean for USA fallback

- **WHEN** job data is successfully fetched from Jooble
- **THEN** the system SHALL calculate the mean salary and generate histogram buckets to match the application's required `HistogramData` format.

#### Scenario: Histogram reused from an existing job-search cache entry

- **WHEN** a histogram is requested for a title/location combination that has a fresh, cached job-search response from an equivalent job-listing request served via Jooble
- **THEN** the system SHALL derive the histogram from that cached response's job data without making a second live Jooble API call.

#### Scenario: Histogram falls back to a live fetch on a cache miss

- **WHEN** a histogram is requested and no fresh cached job-search response exists for the equivalent request
- **THEN** the system SHALL fetch fresh data from Jooble using `extractSearchAnchorPhrase`, consistent with the equivalent job-listing request.

### Requirement: Jooble API Category Filtering via Keyword Enhancement

The Jooble fallback utility (`server/utils/jooble.ts` and `server/utils/fallback.ts`) SHALL accept an optional category parameter and incorporate the category context into the `keywords` field sent in the JSON POST body to Jooble when Adzuna fallback is triggered.

#### Scenario: Executing Jooble fallback with category

- **WHEN** Adzuna fails for a USA request that specified an industry category
- **THEN** the system SHALL forward the category to `fetchJoobleData` and append the category term to `keywords` to refine results within that industry.
