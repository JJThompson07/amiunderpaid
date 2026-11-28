## Why

Adzuna's API terms require a separate commercial licence for revenue-generating use, and Adzuna has not responded to licensing enquiries. Continuing to ship Adzuna data or retain cached Adzuna documents creates legal and operational exposure as BenchmarkMyRole launches its paid API.

Wait-and-see is not viable because Adzuna is currently woven into four distinct layers of the stack:

1. **Live job listings and salary distributions** (`server/utils/adzuna.ts`, `server/api/market-data/{jobs,salary}.ts`): Adzuna is the UK fallback behind Reed and the USA primary ahead of Jooble.
2. **Industry salary trends** (`server/utils/industryTrendsSync.ts`, `server/utils/adzunaHistory.ts`, `adzuna_industry_trends`): monthly average salaries are pulled from Adzuna's `/history` endpoint at 20 calls/minute across ~54 category/country pairs.
3. **Industry taxonomy** (`adzuna_categories`, `/api/market-data/categories`, `/admin/adzuna`): categories come from Adzuna's `/categories` endpoint, mixing genuine industries (`it-jobs`, `manufacturing-jobs`) with non-industry job types (`admin-jobs`, `sales-jobs`, `graduate-jobs`, `part-time-jobs`).
4. **Search-time industry matching** (`useLocationEngine.ts`, `useJobSearchEngine.ts`): a search's industry (`adzunaCategory`) is taken from `jobsData.results[0].category.label`. Because Reed and Jooble hardcode `category: { label: 'Unknown', tag: 'unknown' }`, any search not served by Adzuna (or with zero live listings) resolves no industry.

We can replace every one of these with properly licensed or public-domain/Open Government Licence data:

- **UK live listings:** Reed only. When Reed fails or returns zero results, fall back to official ONS data rather than a secondary job board.
- **US live listings:** Careerjet Publisher API (`GET https://search.api.careerjet.net/v4/query`) as primary, Jooble as fallback, and BLS OEWS data as the baseline fallback when both fail.
- **Industry salary trends:** official monthly regular earnings (excluding bonuses and arrears) — **ONS Average Weekly Earnings by industry** (EARN03, plus EARN02 for Manufacturing; not seasonally adjusted, the only basis ONS publishes by section) for the UK and **BLS Current Employment Statistics (CES)** seasonally adjusted Average Weekly Earnings of All Employees for the US, annualized (`× 52`) and ingested by a daily `CRON_SECRET`-guarded cron that writes only when a new month is published.
- **Industry taxonomy & search matching:** a static, code-owned industry list mapped to UK SIC 2007 sections and US NAICS sectors (keeping surviving URL slugs and 301-redirecting dropped/consolidated slugs), paired with a deterministic SOC → industry lookup for the salary and benchmark pages, generated from official occupation × industry tables (identified and verified at pre-flight). The jobs page uses the industry the user selected, or none.

This change slots in **after `uk-geo-economics-ingestion`** (reusing `server/utils/cronAuth.ts` `verifyCronSecret` and the admin sync-status pattern) and **before `reed-percentiles-and-geo-cascade`**.

## What Changes

- **Remove Adzuna completely:**
  - Delete `server/utils/adzuna.ts`, `server/utils/adzunaHistory.ts`, `server/api/admin/adzuna-locations.get.ts`, `app/pages/admin/adzuna.vue`, `server/utils/cacheReExpiry.ts`, `server/api/admin/re-expire-category-cache.post.ts`, and their unit tests.
  - Remove `ADZUNA_LOCATION_MAP` from `server/constants/locations.ts` and `adzunaAppId` / `adzunaAppKey` from `nuxt.config.ts` `runtimeConfig`.
  - Extract `generateCacheKey` into `server/utils/marketCacheKey.ts` and rename `sanitizeAdzunaData` → `sanitizeMarketData` in `shared/utils/sanitize.ts`.
  - Update `MarketDataProvider` in `shared/utils/market-data.ts` to `'reed' | 'careerjet' | 'jooble'`.
- **New live provider chain & runtime-configurable short cache TTLs (`server/api/market-data/{jobs,salary}.ts`, `server/utils/fallback.ts`):**
  - **UK (`gb`):** Reed only (`fetchReedData`). On zero results no secondary job board is queried and `jobs.ts` returns an empty Reed result; on an upstream error it returns 503 and `computeBenchmark` falls back to ONS baselines (`live: null`).
  - **US (`us`):** Careerjet Publisher API (`server/utils/careerjet.ts`) as primary → Jooble (`server/utils/jooble.ts`) as fallback → BLS baselines when both fail.
  - **Runtime-configured cache TTLs:** Primary live responses (Reed for UK, Careerjet for US) expire after `config.liveCachePrimaryTtlDays` (default `7` days, down from today's 30, overridable via `NUXT_LIVE_CACHE_PRIMARY_TTL_DAYS`), and fallback (Jooble) or zero-result responses expire after `config.liveCacheFallbackTtlHours` (default `24` hours, overridable via `NUXT_LIVE_CACHE_FALLBACK_TTL_HOURS`).
  - **`/api/market-data/salary` contract fix:** returns `{ histogram, mean, count, provider }` (derived from `buildTieredJobResponse` for all three providers) and `tryReuseJobsCacheHistogram` reuses cached job responses across `'reed' | 'careerjet' | 'jooble'`.
  - **Display-only rule:** job listings remain strictly display-only on the consumer site, never exposed in the paid BenchmarkMyRole API.
- **Official monthly industry trends (`server/utils/industryTrendsSync.ts`, `server/api/cron/sync-trends.get.ts`):**
  - **UK:** parses ONS **EARN03** sheet `1. NSA ind monthly figs` (and **EARN02** sheet `4. NSA sect monthly figs` for Manufacturing), computing regular pay = Average Weekly Earnings − Bonuses − Arrears per SIC 2007 section by CDID (verified 2026-11-27), annualized `× 52`, for 19 industries.
  - **US:** queries **BLS Public Data API v2** (`POST https://api.bls.gov/publicAPI/v2/timeseries/data/`) for **CES seasonally adjusted Average Weekly Earnings of All Employees** (`CES…11`, annualized `× 52`) for 16 industries in one POST. BLS has no AWE series for NAICS 52, 53 or 61 alone, so finance and teaching use the Financial Activities and Private Education & Health supersectors (with a chart note), and property is UK-only.
  - **Daily cron (`0 6 * * *` in `vercel.json`):** checks ONS and BLS independently via `Promise.allSettled`. Compares the newest published month against Firestore `industry_trends_meta/{gb|us}`; writes to `industry_trends/{country}_{tag}` and invalidates the Nitro cache only when a new month appears (or on first run / forced backfill, backfilling ≥12 months). Keeps the last good value on failure and records redacted `lastError` (§9.6).
  - **US private-employer disclosure:** On US industry trends pages (`/insights/industry-trends` when `teaching-jobs` or `healthcare-nursing-jobs` is visible, and on `/insights/industry-trends/teaching-jobs` and `/insights/industry-trends/healthcare-nursing-jobs`), display an i18n note disclosing that BLS CES earnings cover private-sector employers only, and a second note when a US industry uses a broader supersector series.
  - **Admin visibility:** `app/pages/admin/admin-actions.vue` displays `lastSyncedAt`, `latestMonth`, and `lastError` independently for `UK (ONS AWE)` and `US (BLS CES)`.
- **SIC / NAICS industry taxonomy & 301 redirects (`shared/utils/industries.ts`):**
  - Replaces `adzuna_categories` with a canonical 19-industry list mapped 1-to-1 to UK SIC 2007 sections and US NAICS sectors:
    - Surviving existing slugs: `it-jobs` (SIC J / NAICS 51), `accounting-finance-jobs` (SIC K / NAICS 52), `healthcare-nursing-jobs` (SIC Q / NAICS 62), `teaching-jobs` (SIC P / NAICS 61), `trade-construction-jobs` (SIC F / NAICS 23), `manufacturing-jobs` (SIC C / NAICS 31–33), `retail-jobs` (SIC G45,47 / NAICS 44–45), `logistics-warehouse-jobs` (SIC H / NAICS 48–49), `hospitality-catering-jobs` (SIC I / NAICS 72), `property-jobs` (SIC L; UK only), `energy-oil-gas-jobs` (SIC B / NAICS 21), `charity-voluntary-jobs` (SIC S / NAICS 81).
    - New SIC/NAICS sector slugs: `professional-services-jobs` (SIC M / NAICS 54), `wholesale-jobs` (SIC G46 / NAICS 42), `utilities-jobs` (SIC D&E / NAICS 22), `arts-entertainment-jobs` (SIC R / NAICS 71), `business-support-jobs` (SIC N / NAICS 56), plus UK-only `public-sector-jobs` (SIC O) and `agriculture-jobs` (SIC A).
  - On a USA host, the UK-only industries (`property-jobs`, `public-sector-jobs`, `agriculture-jobs`) 301 to the hub.
  - 301 redirects under `/insights/industry-trends/`:
    - `engineering-jobs`, `legal-jobs`, `consultancy-jobs`, `scientific-qa-jobs`, and `pr-advertising-marketing-jobs` → `/insights/industry-trends/professional-services-jobs`.
    - `creative-design-jobs` → `/insights/industry-trends/arts-entertainment-jobs`.
    - `social-work-jobs` → `/insights/industry-trends/healthcare-nursing-jobs`.
    - `travel-jobs` → `/insights/industry-trends/hospitality-catering-jobs`.
    - `maintenance-jobs` → `/insights/industry-trends/trade-construction-jobs`.
    - `admin-jobs` and `domestic-help-cleaning-jobs` → `/insights/industry-trends/business-support-jobs`.
    - `sales-jobs`, `customer-services-jobs`, `hr-jobs`, `graduate-jobs`, `part-time-jobs`, `other-general-jobs`, and `unknown` → `/insights/industry-trends` (the hub).
- **Industry on searches:**
  - **Salary and benchmark (`shared/utils/socIndustryMap.ts`):** maps the resolved UK SOC 2020 or US SOC 2018 code to its most likely industry without a live provider hit, from a static table generated by `scripts/build-soc-industry-map.ts` out of official occupation × industry data verified at pre-flight; unmatched codes resolve to `null`. Returned on `RoleResolution.industry` and used by `useLocationEngine`.
  - **Jobs page (`useJobSearchEngine`):** the industry the user selected (`?category=`), or `null`. Today the label comes from the first listing, which Reed and Jooble always tag `'Unknown'`, and its only consumer is the recruiter cards that `recruiter-deprecation-and-regional-explorer` deletes.
- **Adzuna data purge and collection rename (`scripts/purge-adzuna-data.ts`):**
  - Renames `adzuna_industry_trends` → `industry_trends`, `adzuna_jobs_cache` → `market_jobs_cache`, and `adzuna_distribution_cache` → `market_distribution_cache`; retires `adzuna_categories`.
  - `--copy`, run just before deploy, copies non-expired `provider in ['reed', 'jooble']` cache documents (and any `is_admin_verified: true` SOC mappings stripped of Adzuna data) to `market_jobs_cache` and `market_distribution_cache`, so the cache isn't cold at cutover.
  - `--execute`, run after deploy and a successful trends sync, re-copies anything newer and deletes all documents in `adzuna_industry_trends`, `adzuna_categories`, `adzuna_jobs_cache`, and `adzuna_distribution_cache`.
- **Provider terms and privacy:** a pre-flight check that Careerjet's and Jooble's terms allow caching, derived salary statistics, and commercial use; the privacy policy names Careerjet as receiving US visitors' IP address and user agent.
- **UI, attribution, i18n, and specs cleanup:**
  - Removes all Adzuna references across UI components, admin pages, `i18n/locales/{en-GB,en-US}/*.json`, privacy policy, data sources, and E2E tests.
  - Adds Careerjet attribution (`Jobs by Careerjet` linking to `https://www.careerjet.com`, `SectionCareerjetJobListing.vue` routing clicks through Careerjet's tracking URL).
  - Renames `Section/Adzuna/{Comparison,Histogram}.vue` → `Section/Market/`, and updates `CODE_STANDARDS.md` §9.6, `COUNTRY_GUIDELINES.md`, `README.md`, `.env.example`, and `cspell.config.json`.

## Scope

- Complete removal of Adzuna code, config, UI, i18n, specs, and stored Firestore data.
- Careerjet Publisher API integration as US primary live provider (with Jooble fallback).
- ONS Average Weekly Earnings by industry (regular pay) and BLS CES Average Weekly Earnings monthly ingestion, daily cron, US coverage notes, and admin sync-status display.
- Static SIC/NAICS industry taxonomy, 301 redirects for dropped/consolidated category slugs, and SOC → industry lookup for salary and benchmark searches.

## Non-goals

- Exposing live listings (Reed, Careerjet, or Jooble) in the paid BenchmarkMyRole API (`/v1/**`). Listings remain display-only on the consumer site.
- Reed quota guard, single-flight wrapper, percentiles, live geo cascade, and nightly pre-warm cron: owned by `reed-percentiles-and-geo-cascade`, which runs immediately after this change.
- UK House Price Index and the `/data-sources` full OGL card rewrite: owned by `amiunderpaid-seo-funnel`.

## Capabilities

### New Capabilities

- `careerjet-provider`: US primary live job search via Careerjet API v4, end-user context forwarding (`user_ip`, `user_agent`, `Referer`), salary normalization, dual-tier statistics, and attribution.
- `soc-industry-mapping`: code-owned SIC/NAICS industry taxonomy, and deterministic SOC 2020 (UK) / SOC 2018 (US) → industry mapping for salary and benchmark searches without a live provider hit.

### Modified Capabilities

- `reed-api-fallback`: UK routes exclusively to Reed and falls back to ONS data on zero results or failure; USA routes to Careerjet primary with Jooble fallback.
- `jooble-api-fallback`: triggers as USA secondary provider when Careerjet fails or returns zero results.
- `market-data-caching`: runtime-configured `liveCachePrimaryTtlDays` (default 7 days) for primary providers (Reed UK, Careerjet US) and `liveCacheFallbackTtlHours` (default 24 hours) for fallback (Jooble US) in `market_jobs_cache` and `market_distribution_cache`; invalidates legacy `provider === 'adzuna'` entries and removes per-category `adzuna_categories` TTL overrides.
- `industry-trends`: replaces Adzuna `/history` sync with a daily `CRON_SECRET`-guarded cron ingesting ONS regular pay by industry (UK) and BLS CES Average Weekly Earnings (US) into `industry_trends` with per-source status metadata, ≥12-month backfill, and US coverage notes.
- `industry-trends-seo`: serves surviving SIC/NAICS industry slugs from `industry_trends` and 301-redirects dropped/consolidated slugs and industries with no data for the host's country.
- `live-job-search`: UK copy and SEO metadata reference Reed only; US copy and SEO metadata reference Careerjet and Jooble only; the jobs page's industry comes from the user's selection.
- `job-provider-ui`: adds Careerjet attribution, updates dev toggle options, and removes Adzuna from listings and data-sources tiles.
- `dev-provider-toggle`: supports `'auto' | 'reed' | 'careerjet' | 'jooble'`.
- `admin-actions-page`: displays per-source (`UK — ONS AWE`, `US — BLS CES`) last successful sync, latest published month, and last error.

### Removed Capabilities

- `adzuna-adapter`: all requirements removed.
- `adzuna-taxonomy-sync`: all requirements removed.

## Impact

- **New:**
  - `server/utils/careerjet.ts` (+ `server/utils/tests/careerjet.spec.ts`)
  - `server/utils/marketCacheKey.ts` (+ `server/utils/tests/marketCacheKey.spec.ts`)
  - `server/api/admin/sync-trends-status.get.ts` (+ `server/api/admin/tests/sync-trends-status.spec.ts`)
  - `shared/utils/industries.ts` (+ `shared/utils/tests/industries.spec.ts`)
  - `shared/utils/socIndustryMap.ts` (+ `shared/utils/tests/socIndustryMap.spec.ts`), generated `shared/utils/socIndustryMap.data.ts`, and `scripts/build-soc-industry-map.ts`
  - `app/components/Section/Careerjet/JobListing.vue`
  - `app/components/Section/Market/{Comparison,Histogram}.vue` (renamed from `Section/Adzuna/`)
  - `scripts/purge-adzuna-data.ts`
- **Deleted:**
  - `server/utils/adzuna.ts` (+ `server/utils/tests/adzuna.spec.ts`)
  - `server/utils/adzunaHistory.ts` (+ `server/utils/tests/adzunaHistory.spec.ts`)
  - `server/utils/cacheReExpiry.ts` (+ `server/utils/tests/cacheReExpiry.spec.ts`)
  - `server/api/admin/adzuna-locations.get.ts` (+ `server/api/admin/tests/adzuna-locations.spec.ts`)
  - `server/api/admin/re-expire-category-cache.post.ts` (+ `server/api/admin/tests/re-expire-category-cache.spec.ts`)
  - `app/pages/admin/adzuna.vue`
- **Modified:**
  - `server/utils/{fallback,reed,jooble,industryTrendsSync,industryTrendsCache,cachePurge,searchRelevance}.ts` (+ tests), `server/utils/tests/jobTiering.spec.ts`
  - `server/utils/engine/{types,resolveRole}.ts` (+ test)
  - `server/constants/locations.ts` (+ test)
  - `server/api/market-data/{jobs,salary,categories,industry-trends,update-match.post}.ts` (+ tests)
  - `server/api/cron/sync-trends.get.ts` (+ test)
  - `server/api/admin/{sync-trends.post,seed.post,delete.post,backfill-searches.post}.ts` (+ tests)
  - `server/routes/sitemap.xml.ts` (+ test)
  - `shared/utils/{market-data,sanitize,math,uk,usa}.ts` (+ tests)
  - `app/composables/{useJobs,useCategories,useLocationEngine,useJobSearchEngine,useRecruiterCards}.ts` (+ tests)
  - `app/components/{AmI/NavBar,AmIDevProviderToggle,BaseSearchForm,Section/GovernmentUserSelection,Section/Shared/TrustBadges,Section/Shared/IndustryTrendsChart}.vue` (+ test)
  - `app/pages/insights/industry-trends/{index,[industry]}.vue`
  - `app/pages/{salary,benchmark,jobs}/[title]/[country]/[[location]].vue`
  - `app/pages/{data-sources,privacy-policy,admin/admin-actions,admin/search-logs,recruiter/territories/index}.vue`
  - `i18n/locales/{en-GB,en-US}/{about,card,common,data-sources,faq,how-it-works,insights,landing,meta,navbar,privacy-policy,sections}.json`
  - `e2e/{job-search,api-fallback}.spec.ts`, `tests/firestore.spec.ts`
  - `firestore.rules`, `nuxt.config.ts`, `vercel.json`, `vitest.config.ts`, `.env.example`, `cspell.config.json`
  - `CODE_STANDARDS.md`, `COUNTRY_GUIDELINES.md`, `README.md`, `comingUp.md`
- **No new runtime dependencies** (`xlsx` and `ofetch` are already installed).
