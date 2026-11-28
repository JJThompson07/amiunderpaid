## MODIFIED Requirements

### Requirement: Historical Data Storage

The system SHALL persist monthly historical average earnings per industry in the `industry_trends` Firestore collection, sourced from official government statistics, syncing every industry in `shared/utils/industries.ts` for each country regardless of recent search activity:

- **UK:** ONS Average Weekly Earnings, not seasonally adjusted, regular pay (Average Weekly Earnings − Bonuses − Arrears) per UK SIC 2007 section, from EARN03 sheet `1. NSA ind monthly figs` (and EARN02 sheet `4. NSA sect monthly figs` for Manufacturing, which EARN03 splits into C1–C6).
- **USA:** BLS Current Employment Statistics (CES) seasonally adjusted Average Weekly Earnings of All Employees (`CES…11`) per NAICS sector or supersector.

Both are annualized (`× 52`).

#### Scenario: Admin triggers backfill sync

- **WHEN** the sync runs with `force: true`, or for a country with no `industry_trends_meta/{country}` record or fewer than 12 months of stored history
- **THEN** the system fetches and writes at least 12 months of annualized monthly earnings for every industry configured for that country into `industry_trends/{country}_{categoryTag}`
- **AND** records `latestMonth`, `lastSyncedAt`, `lastCheckedAt`, `industryCount`, and `lastError: null` in `industry_trends_meta/{country}`.

#### Scenario: Monthly delta sync

- **WHEN** the daily sync runs and ONS or BLS has published a month newer than `industry_trends_meta/{country}.latestMonth`
- **THEN** the system SHALL write the updated monthly series to `industry_trends`, update `latestMonth` and `lastSyncedAt` in `industry_trends_meta/{country}`, and invalidate the Nitro industry-trends cache.

#### Scenario: Daily check finds no newly published month

- **WHEN** the daily sync runs and the source's newest published month equals `industry_trends_meta/{country}.latestMonth`
- **THEN** the system SHALL skip rewriting `industry_trends` documents for that source, update `lastCheckedAt` and `lastError: null`, and report `skipped: true`.

#### Scenario: A category has no recent search activity

- **WHEN** an industry has had no live job-search traffic recently
- **THEN** the sync still stores its latest data point exactly as for a high-traffic industry; sync coverage SHALL NOT depend on `market_jobs_cache` activity.

### Requirement: Rate-Limit-Safe Sync

The system SHALL update the UK (ONS) and US (BLS) sources independently (`Promise.allSettled`), validate data shape before any Firestore write, keep the last good stored data on failure, and record a credential-redacted `lastError` on `industry_trends_meta/{country}`. The UK sync SHALL download at most two ONS workbooks per run, and the US sync SHALL fetch every configured CES series in one batched POST to `https://api.bls.gov/publicAPI/v2/timeseries/data/`, so a daily check uses one BLS query.

#### Scenario: Sync spans more categories than the per-minute limit allows

- **WHEN** the sync covers every configured industry for both countries
- **THEN** the system makes at most two ONS workbook downloads and one BLS request per run, never one request per industry.

#### Scenario: A single category is rate-limited or fails

- **WHEN** one configured series is missing from the ONS workbook or the BLS response, or the BLS request returns HTTP 429 or a non-`REQUEST_SUCCEEDED` status
- **THEN** that country's source is treated as failed for this run, its existing `industry_trends` documents are left untouched, `lastError` names the missing series or status, and the other country's source still completes.

#### Scenario: One source fails while the other succeeds

- **WHEN** the ONS fetch or validation fails during a run while the BLS fetch succeeds with a new month
- **THEN** the US `industry_trends` documents and `industry_trends_meta/us` SHALL be updated normally
- **AND** the UK `industry_trends` documents SHALL remain untouched while `industry_trends_meta/gb.lastError` records the redacted failure message.

#### Scenario: Upstream format change fails shape validation

- **WHEN** an ONS workbook or BLS response is missing any configured series, has fewer than 12 valid monthly points for any series, or has an annualized value outside the plausibility range
- **THEN** the parser SHALL treat the source as failed without overwriting any existing `industry_trends` document.

### Requirement: Automated Monthly Sync Trigger

The system SHALL run a daily scheduled cron (`GET /api/cron/sync-trends`, `0 6 * * *`) authenticated via `verifyCronSecret(event)` (`CRON_SECRET` Bearer token) that checks ONS and BLS for newly published monthly data, without a human calling the admin endpoint.

#### Scenario: Scheduled trigger fires

- **WHEN** the daily cron invokes `GET /api/cron/sync-trends` with a valid `CRON_SECRET`
- **THEN** the system checks both sources with `force: false` and writes to Firestore only for a source that has published a new month.

#### Scenario: Unauthenticated or incorrectly authenticated trigger request

- **WHEN** `/api/cron/sync-trends` receives a request without the valid `CRON_SECRET`
- **THEN** the system rejects it with 401 and does not run the sync.

## ADDED Requirements

### Requirement: US Private-Sector Coverage Disclosure

The industry trends chart (`app/components/Section/Shared/IndustryTrendsChart.vue`) SHALL display a disclosure note in the US region when a shown industry is flagged `us.privateSectorNote` (`teaching-jobs` and `healthcare-nursing-jobs`), stating that BLS CES industry earnings cover private-sector employers only.

#### Scenario: Viewing US Teaching & Education or Healthcare & Nursing trends

- **WHEN** a user views the industry trends chart in the USA region with `teaching-jobs` or `healthcare-nursing-jobs` shown
- **THEN** the chart SHALL display a localized note stating that BLS CES industry series cover private-sector employers only.

#### Scenario: Viewing UK trends or other US private-sector industries

- **WHEN** a user views the chart in the UK region, or a US industry without `privateSectorNote` (such as `it-jobs`)
- **THEN** the disclosure note SHALL NOT be rendered.

### Requirement: Broader US Series Disclosure

When a US industry is backed by a BLS supersector series broader than its label (`accounting-finance-jobs` uses Financial Activities, which includes real estate; `teaching-jobs` uses Private Education & Health Services), the chart SHALL show a localized note naming the broader series.

#### Scenario: Viewing US finance or teaching trends

- **WHEN** a user views the US chart with `accounting-finance-jobs` or `teaching-jobs` shown
- **THEN** the chart SHALL display a note naming the broader BLS series that backs it.

#### Scenario: Viewing an industry with an exact series

- **WHEN** a user views a US industry with an exact sector series (such as `it-jobs`) or any UK industry
- **THEN** no broader-series note SHALL be rendered.
