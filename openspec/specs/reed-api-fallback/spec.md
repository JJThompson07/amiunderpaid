# reed-api-fallback Specification

## Purpose

Provides a fallback mechanism using the Reed.co.uk Jobseeker API to serve job data and calculate salary statistics when primary providers fail.

## Requirements

### Requirement: Reed API Job Data Fetching

The system SHALL fetch active job vacancies from the Reed.co.uk API using the provided job title and location, primarily acting as the primary provider for UK traffic. Outbound HTTP requests to the Reed API SHALL enforce an explicit timeout of 6,000 milliseconds (6 seconds) to prevent serverless function hangs and ensure prompt failover to secondary providers on downstream degradation. The initial (Tier 1) query SHALL quote the full search title OR'd with the extracted anchor phrase (see `search-relevance-and-specificity`) — e.g. `"${title}" OR "${anchorPhrase}"` — for exact-phrase matching, or just the quoted full title alone when anchor extraction is a no-op, falling back to an unquoted full-title search when Tier 1 returns fewer than 15 relevant results with salaries.

#### Scenario: Successful job data retrieval

- **WHEN** the system requests jobs with a valid title and location for the UK region
- **THEN** it SHALL return a list of job objects containing `minimumSalary` and `maximumSalary`.

#### Scenario: Tier 1 combines the full title and anchor phrase via OR

- **WHEN** the search title is `"Group Head of Finance"` (anchor extraction yields `"Head of Finance"`, distinct from the full title)
- **THEN** the system SHALL query Reed with `keywords: '"Group Head of Finance" OR "Head of Finance"'`.

#### Scenario: Tier 1 search yields insufficient results

- **WHEN** the Tier 1 quoted search (full title, optionally OR'd with the anchor phrase) returns fewer than 15 relevant results with salaries
- **THEN** the system SHALL fall back to an unquoted search using the full original search title, applying the same domain-token relevance filter and IQR salary outlier trimming.

#### Scenario: Tier 1 search yields sufficient results

- **WHEN** the Tier 1 quoted search returns 15 or more relevant results with salaries
- **THEN** the system SHALL return the Tier 1 results directly without making a secondary unquoted API call, conserving upstream API quota.

#### Scenario: Upstream request timeout triggers fallback

- **WHEN** the Reed API does not respond within 6,000 milliseconds
- **THEN** the request SHALL abort with a timeout error, enabling the market data gateway to fail over to the regional secondary provider.

### Requirement: Server-Side Statistical Calculation

Since the Reed API does not provide pre-calculated histograms, the system SHALL calculate the necessary statistics (mean, average, percentiles) and generate a histogram structure from the aggregated minimum and maximum salaries of the fetched jobs. When the histogram is requested independently of the job-listing search (e.g. via `server/api/market-data/salary.ts`), the system SHALL derive it from the same job-search response already fetched and cached for the equivalent job-listing request (`server/api/market-data/jobs.ts`) rather than issuing a second, independent Reed API call for the same search. A live Reed call SHALL only be made when no fresh cached job-search response exists for the equivalent request.

#### Scenario: Calculating histogram and mean

- **WHEN** job data is successfully fetched from Reed
- **THEN** the system SHALL calculate the mean salary and generate histogram buckets to match the application's required `HistogramData` format.

#### Scenario: Histogram reused from an existing job-search cache entry

- **WHEN** a histogram is requested for a title/location/filter combination that has a fresh, cached job-search response from an equivalent job-listing request
- **THEN** the system SHALL derive the histogram from that cached response's job data without making a second live Reed API call.

#### Scenario: Histogram falls back to a live fetch on a cache miss

- **WHEN** a histogram is requested and no fresh cached job-search response exists for the equivalent request
- **THEN** the system SHALL fetch fresh data from Reed using the same job/contract type filters the equivalent job-listing request would use, not empty or default filters.

### Requirement: Reed API Category Filtering via Keyword Enhancement

The Reed fallback utility (`server/utils/reed.ts` and `server/utils/fallback.ts`) SHALL accept an optional category parameter and incorporate the category context into the `keywords` query sent to the Reed.co.uk API when Adzuna fallback is triggered.

#### Scenario: Executing Reed fallback with category

- **WHEN** Adzuna fails for a UK request that specified an industry category
- **THEN** the system SHALL forward the category to `fetchReedData` and append the category term to `keywords` to refine results within that industry.

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
