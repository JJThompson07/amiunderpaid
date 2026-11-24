## ADDED Requirements

### Requirement: Reed usage is counted and capped

The system MUST count Reed API calls per UTC day and per calendar month in a store shared across instances, and MUST NOT start a Reed search when doing so would leave less than the configured reserve under either cap.

#### Scenario: Daily budget nearly spent

- **WHEN** 960 Reed calls have been counted today, the daily cap is 1,000 and the reserve is 50
- **THEN** a new cold UK search makes no Reed call

### Requirement: Quota exhaustion serves stale data before falling back

When a UK live search is blocked by the quota guard, the system SHALL serve the newest cached result for that search even if it has expired, marked `stale: true`, and SHALL only use the secondary provider when no cached result exists. Serving stale data MUST NOT extend the cached entry's expiry.

#### Scenario: Expired cache exists

- **WHEN** the quota guard blocks a search whose cache entry expired yesterday
- **THEN** the response contains that entry's data with `stale: true` and the entry's `expiresAt` is unchanged

#### Scenario: No cache exists

- **WHEN** the quota guard blocks a search with no cache entry
- **THEN** the existing UK fallback provider is used

### Requirement: Live tier widens by cache only

For UK requests with a location, when the exact-location live sample is smaller than the minimum sample size, the engine SHALL use a fresh cached result for the location's region, else the fresh cached national result scaled by the ONS regional all-roles ratio. It MUST NOT make any additional provider call to do so, and MUST report the tier used as `basis` together with `sampleSize`.

#### Scenario: Thin town, cached region

- **WHEN** the live search for "actuary" in Leamington Spa yields 4 salaries and a fresh West Midlands entry has 38
- **THEN** the live tier uses the West Midlands entry with `basis: 'regional-cache'` and `sampleSize: 38`, and no extra provider call is made

#### Scenario: Nothing wider cached

- **WHEN** the exact sample is thin and neither a regional nor a national cached entry is fresh
- **THEN** the exact result is used with `basis: 'exact'` and its true `sampleSize`

### Requirement: Demand-ranked nightly pre-warm within budget

A nightly cron SHALL refresh missing or soon-expiring UK live entries in descending order of demand over the last 30 days of searches, MUST stop at the configured pre-warm call budget or when the quota guard refuses, and SHALL email a summary of what it refreshed and why it stopped.

#### Scenario: Budget reached

- **WHEN** the pre-warm budget is 300 calls and 200 ranked keys need refreshing
- **THEN** at most 150 searches are refreshed, the most-demanded first, and the summary reports stopping on budget

#### Scenario: Unauthorised call

- **WHEN** `/api/cron/prewarm-live` is called without the correct `CRON_SECRET`
- **THEN** it responds 401 and makes no provider calls
