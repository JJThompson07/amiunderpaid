## MODIFIED Requirements

### Requirement: Server-Side Statistical Calculation

Since the Reed API does not provide pre-calculated histograms, the system SHALL calculate the necessary statistics (mean, the p10/p25/p50/p75/p90 percentiles and the sample size, all from the same sanitised and outlier-trimmed salaries) and generate a histogram structure from the aggregated minimum and maximum salaries of the fetched jobs. Percentiles SHALL be null when fewer than 5 salaries remain after trimming. When the histogram is requested independently of the job-listing search (e.g. via `server/api/market-data/salary.ts`), the system SHALL derive it from the same job-search response already fetched and cached for the equivalent job-listing request (`server/api/market-data/jobs.ts`) rather than issuing a second, independent Reed API call for the same search. A live Reed call SHALL only be made when no fresh cached job-search response exists for the equivalent request, and concurrent requests for the same search on one server instance SHALL share a single in-flight Reed search.

#### Scenario: Calculating histogram and mean

- **WHEN** job data is successfully fetched from Reed
- **THEN** the system SHALL calculate the mean salary and generate histogram buckets to match the application's required `HistogramData` format.

#### Scenario: Calculating percentiles

- **WHEN** a Reed search yields 40 salaries after sanitising and trimming
- **THEN** the response SHALL include p10, p25, p50, p75 and p90 computed from those 40 salaries and `sampleSize: 40`

#### Scenario: Too few salaries for percentiles

- **WHEN** a Reed search yields 3 salaries after trimming
- **THEN** percentiles SHALL be null and `sampleSize` SHALL be 3

#### Scenario: Histogram reused from an existing job-search cache entry

- **WHEN** a histogram is requested for a title/location/filter combination that has a fresh, cached job-search response from an equivalent job-listing request
- **THEN** the system SHALL derive the histogram from that cached response's job data without making a second live Reed API call.

#### Scenario: Concurrent cold requests for the same search

- **WHEN** the listings request and the histogram request for the same uncached search arrive concurrently on one instance
- **THEN** exactly one Reed search (two tier calls) SHALL be made and both requests SHALL be answered from its result

#### Scenario: Histogram falls back to a live fetch on a cache miss

- **WHEN** a histogram is requested and no fresh cached job-search response exists for the equivalent request
- **THEN** the system SHALL fetch fresh data from Reed using the same job/contract type filters the equivalent job-listing request would use, not empty or default filters.
