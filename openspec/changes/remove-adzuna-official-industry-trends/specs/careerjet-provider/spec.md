## ADDED Requirements

### Requirement: Careerjet API v4 Job Data Fetching

The system SHALL fetch active US job vacancies from the Careerjet Publisher API (`GET https://search.api.careerjet.net/v4/query`) as the primary live market provider for USA traffic (`locale_code: 'en_US'`). Authentication MUST use HTTP Basic Authentication with the private `careerjetApiKey` runtimeConfig secret as username and an empty password. Every outbound request MUST include an explicit timeout of 6,000 milliseconds (6 seconds) and MUST forward the end-user's IP address (`user_ip`), browser User-Agent (`user_agent`), and a canonical `Referer` header.

#### Scenario: Successful US job data retrieval from Careerjet

- **WHEN** the system requests jobs with a valid title and location for the USA region
- **THEN** it SHALL query `https://search.api.careerjet.net/v4/query` with `locale_code=en_US`, `user_ip`, `user_agent`, and `Referer`
- **AND** return a dual-tier `JobSearchResponse` with `provider: 'careerjet'`.

#### Scenario: Upstream request timeout or error triggers Jooble fallback

- **WHEN** the Careerjet API does not respond within 6,000 milliseconds or returns an HTTP error or zero matching listings
- **THEN** the market data gateway SHALL automatically fail over to the Jooble API for USA traffic.

#### Scenario: Both US providers find no listings

- **WHEN** neither Careerjet nor Jooble returns listings and at least one of them answered successfully with zero results
- **THEN** `/api/market-data/jobs` SHALL return 200 with an empty listings payload cached for `liveCacheFallbackTtlHours` hours, not an error.

#### Scenario: Both US providers fail

- **WHEN** Careerjet and Jooble both fail with a network error, HTTP error, or timeout
- **THEN** the market data gateway SHALL return 503 `'Market data temporarily unavailable.'`.

#### Scenario: End-user context does not split the in-memory cache

- **WHEN** two visitors with different IP addresses and User-Agents make the same US search within the in-memory cache window
- **THEN** both SHALL be served by one provider call, because `user_ip` and `user_agent` are not part of the cache key.

### Requirement: Careerjet Salary Normalization and Statistical Calculation

The system SHALL normalize Careerjet job salaries into annual numeric `salary_min` and `salary_max` values using `salary_type` (`'Y'` × 1, `'M'` × 12, `'W'` × 52, `'D'` × 260, `'H'` × 2,080 for full-time or × 1,040 for part-time), falling back to unstructured string parsing when numeric bounds are absent, and SHALL compute the mean, count, and 7-bucket histogram via `buildTieredJobResponse`. When the salary distribution is requested independently via `server/api/market-data/salary.ts`, the system SHALL reuse a fresh cached Careerjet job-search entry from `market_jobs_cache` rather than issuing a second live Careerjet API call.

#### Scenario: Normalizing hourly and monthly Careerjet salaries

- **WHEN** Careerjet returns a full-time job with `salary_min: 50`, `salary_max: 60`, and `salary_type: 'H'`
- **THEN** the system SHALL normalize the listing to `salary_min: 104000` and `salary_max: 124800`.

#### Scenario: Reusing Careerjet histogram from jobs cache

- **WHEN** `/api/market-data/salary` is requested for a US search that has a fresh `market_jobs_cache` document served by `careerjet`
- **THEN** the system SHALL return `{ histogram, mean, count, provider: 'careerjet' }` from that cached document without making a second Careerjet HTTP call.

### Requirement: Careerjet Attribution and Tracking Redirects

Whenever job listings served by Careerjet are rendered on the consumer site, the UI MUST display `"Jobs by Careerjet"` linking to `https://www.careerjet.com` and MUST route listing clicks directly to the `url` tracking redirect returned by Careerjet (`rel="noopener noreferrer"`). Live listings MUST NOT be exposed in the paid BenchmarkMyRole API.

#### Scenario: Rendering Careerjet job listings

- **WHEN** a USA results page renders job listings with `dataProvider === 'careerjet'`
- **THEN** the section header SHALL display `"Jobs by Careerjet"` linking to `https://www.careerjet.com`
- **AND** each role card SHALL link to the sanitized Careerjet tracking URL (Careerjet's `url` field, mapped to the shared `redirect_url` listing field by `mapCareerjetJobs`).
