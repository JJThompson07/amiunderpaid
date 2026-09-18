# Spec Delta: jooble-api-fallback

## MODIFIED Requirements

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
