## Context

- **Sequencing in the roadmap:**
  - `server-side-mca-engine` introduces `server/utils/engine/{types,resolveRole,baselines,computeBenchmark}.ts` and `GET /api/engine/benchmark`. `computeBenchmark` calls `event.$fetch('/api/market-data/salary', { query })` for the live tier, while `useLocationEngine` keeps calling `useJobs().fetchJobs` on the client for display-only listings.
  - `uk-geo-economics-ingestion` extracts `verifyCronSecret(event)` into `server/utils/cronAuth.ts` and sets up the per-source sync metadata + keep-last-good pattern on `app/pages/admin/admin-actions.vue`.
  - **This change** runs next, before `reed-percentiles-and-geo-cascade`.
  - `recruiter-deprecation-and-regional-explorer` runs later and deletes `useRecruiterCards`, the only consumer of the jobs page's industry label.
- **Why `/api/market-data/salary` must return `mean` and `count`:**
  - `fetchAdzunaHistogram` hit Adzuna's `/histogram` endpoint, which returned only `{ histogram }`, so `salary.ts` returned `{ histogram, provider }`. On the client, `useLocationEngine` took `meanLiveSalary` and `totalLiveJobs` from `jobs.ts`.
  - After `server-side-mca-engine`, `computeBenchmark` calls only `/api/market-data/salary`, and `calculateLivePercentile` (`shared/utils/math.ts`) returns `null` whenever `meanSalary` is `0` or absent.
  - With Adzuna gone, every live provider (`reed`, `careerjet`, `jooble`) derives its histogram, `mean`, and `count` from `buildTieredJobResponse`. Returning `{ histogram, mean, count, provider }` from `salary.ts` (and reusing the cached jobs document across all three providers in `tryReuseJobsCacheHistogram`) fixes the server-side live tier for both countries in one step.
- **What the industry label does today (verified 2026-11-27):**
  - `useJobSearchEngine.ts` sets `adzunaCategory` from `jobsData.results[0].category.label`. On the jobs page its only consumer is `useRecruiterCards`. Reed (`reed.ts`) and Jooble (`jooble.ts`) hardcode `category: { label: 'Unknown', tag: 'unknown' }`, so UK and US-fallback searches already pass `'Unknown'`.
  - The salary and benchmark pages show it in `Section/GovernmentUserSelection.vue` and in verdict copy (`adzunaCategory || 'your industry'`). They already resolve a SOC code (`matchedIdCode`); the jobs page does not.

## Goals / Non-Goals

**Goals:**

- Zero Adzuna code, credentials, UI copy, or stored Firestore documents remain after this change completes.
- UK live listings use Reed only and degrade cleanly to ONS baselines when Reed fails or returns 0 jobs.
- US live listings use Careerjet Publisher API v4 as primary and Jooble as fallback, and degrade cleanly to BLS baselines when both fail.
- Industry salary trends come from official monthly government regular earnings: ONS Average Weekly Earnings by industry (UK) and BLS CES Average Weekly Earnings (US), checked daily and written only when a new month is published.
- Salary and benchmark searches resolve an industry from their SOC code without a live job-board hit. The jobs page uses the industry the user selected, or none.
- Dropped or consolidated category URLs 301-redirect so existing backlinks never 404.
- Live-cache hit rates survive the cutover (the cache is copied to the new collections before deploy).

**Non-Goals:**

- Exposing live job-board data in `/v1/**` API endpoints.
- Building the Reed quota guard or live geo cascade (next change: `reed-percentiles-and-geo-cascade`).
- A SOC-derived industry on the jobs page. Nothing would consume it once recruiter cards are removed.

## Decisions

### D1. Live provider routing, Careerjet v4 adapter, and cache TTLs

| Region | Primary Live Provider   | Secondary Live Provider | Baseline Fallback (when live fails or is 0) |
| ------ | ----------------------- | ----------------------- | ------------------------------------------- |
| UK     | Reed (`reed`)           | None                    | ONS ASHE (`baselines.ts`, `live: null`)     |
| USA    | Careerjet (`careerjet`) | Jooble (`jooble`)       | BLS OEWS (`baselines.ts`, `live: null`)     |

**Careerjet v4 adapter (`server/utils/careerjet.ts`):**

- **Endpoint & Auth:** `GET https://search.api.careerjet.net/v4/query` with HTTP Basic Auth (`Authorization: Basic ${btoa(`${config.careerjetApiKey}:`)}`), where `careerjetApiKey` is read only from private `runtimeConfig` (§9.1–9.2). Timeout: `6000` ms.
- **End-user context (required by Careerjet v4):** `jobs.ts` and `salary.ts` extract from the H3 `event` and pass into `fetchCareerjetData`:
  - `user_ip`: first IP from `getRequestIP(event, { xForwardedFor: true })`, falling back to `'127.0.0.1'` in local dev.
  - `user_agent`: `getRequestHeader(event, 'user-agent') || 'Mozilla/5.0 (compatible; AmIUnderpaid/1.0)'`.
  - `Referer` header: `https://www.amiunderpaid.com/jobs/${slugify(title)}/usa${location ? `/${slugify(location)}` : ''}`.
  - When `computeBenchmark` calls `salary.ts` via `event.$fetch`, Nitro forwards the original request's headers, so the end user's IP and UA reach Careerjet (verified in `nitropack@2.13.4` `dist/runtime/internal/app.mjs`). Pre-warm or cron callers have no end user; they don't call Careerjet in this change.
- **Query parameters:**
  - `locale_code: 'en_US'`
  - `keywords`: Tier 1 uses `buildTier1Keywords(title, anchorPhrase, categoryKeyword)`; Tier 2 (when `anchorPhrase !== title` or the category keyword is relaxed) uses `buildTier2Keywords(anchorPhrase, categoryKeyword)`, settled together via `Promise.allSettled` (same pattern as `reed.ts`). Pre-flight 1.1 checks whether quoted phrases work.
  - `location`: `location.trim()` when non-empty.
  - `contracttype`: `'p'` for `'permanent'`, `'c'` for `'contract'`, omitted otherwise.
  - `contractperiod`: `'f'` for `'full-time'`, `'p'` for `'part-time'`, omitted otherwise.
  - `page_size: 100`, `page: 1`, `sort: 'relevance'`.
- **Listing mapping:** `mapCareerjetJobs` maps Careerjet's `url` to the shared `JobListing.redirect_url` field (`shared/utils/market-data.ts`), so `SectionCareerjetJobListing` renders `sanitizeUrl(listing.redirect_url)` like the Jooble listing does.
- **Salary normalization (`normalizeCareerjetSalary`):**
  - Careerjet v4 items include optional `salary_min`, `salary_max` (numbers), `salary_type` (`'Y' | 'M' | 'W' | 'D' | 'H'`), and `salary` (formatted string).
  - When a numeric bound is present, multiply by the factor for `salary_type`: `'Y'` → 1, `'M'` → 12, `'W'` → 52, `'D'` → 260, `'H'` → `jobType === 'part-time' ? 1040 : 2080`. If only one bound is present, use it for both.
  - Otherwise fall back to `parseJoobleSalary(job.salary, jobType)`.
  - Mapped Tier 1 and Tier 2 listings go through `buildTieredJobResponse(..., 'us', 'careerjet')` (`server/utils/jobTiering.ts`).
- **Jooble alignment:** `processJoobleData` in `server/utils/jooble.ts` delegates relevance filtering, IQR trimming, sanity bounds, and histogram construction to `buildTieredJobResponse`, so all three providers share the same statistics.
- **Listing category tag:** `mapReedJobs`, `mapCareerjetJobs`, and `processJoobleData` tag listings with the request's `category` resolved via `getIndustryByTag`, or `{ label: 'Unknown', tag: 'unknown' }` when the request has none.
- **Cache TTLs (server `runtimeConfig`, non-secret):**

  | Key                         | Default | Env Override                         |
  | --------------------------- | ------- | ------------------------------------ |
  | `liveCachePrimaryTtlDays`   | `7`     | `NUXT_LIVE_CACHE_PRIMARY_TTL_DAYS`   |
  | `liveCacheFallbackTtlHours` | `24`    | `NUXT_LIVE_CACHE_FALLBACK_TTL_HOURS` |
  - Primary-provider responses with listings (`reed` UK, `careerjet` US) expire after `liveCachePrimaryTtlDays` days. Fallback (`jooble`) and zero-listing responses expire after `liveCacheFallbackTtlHours` hours. No Firestore category-TTL lookup.
  - **Why 7 days:** the cache holds both the listings users see and the salary statistics derived from them. Statistics barely move week to week, but listings close: at today's 30 days many shown jobs are already gone. 3 days keeps listings fresher but roughly doubles Reed calls for popular searches (each fresh UK search costs 2 calls against a 1,000/day quota) before `reed-percentiles-and-geo-cascade` adds the quota guard. 7 days keeps most listings live, costs at most ~9 Reed calls a month per popular search, and leaves a 24-hour window for that change's nightly pre-warm.

- **UK zero-result / error handling:** when `countryCode === 'gb'` and `fetchReedData` returns `count === 0`, `jobs.ts` and `salary.ts` return the empty Reed response (`count: 0, mean: 0, histogram: {}, results: [], similarResults: [], provider: 'reed'`) cached for `liveCacheFallbackTtlHours` hours, without calling `executeMarketFallback`. When `fetchReedData` throws, they return 503 `'Market data temporarily unavailable.'` (§9.3–9.4), so `computeBenchmark` sets `live: null` and scores from ONS baselines.
- **`executeMarketFallback` for UK:** if ever called with `countryCode === 'gb'`, it throws 503 (a downstream provider is unavailable; §9.4), never 404.

### D2. Canonical SIC / NAICS industry taxonomy and 301 redirects (`shared/utils/industries.ts`)

`adzuna_categories` is replaced by a static, code-owned taxonomy in `shared/utils/industries.ts`. Each entry maps a URL slug (`tag`) to its UK SIC 2007 section (with its ONS regular-pay CDID triplet) and its US NAICS sector or BLS supersector (with its CES series ID), or `null` where no official series exists.

**UK source (verified 2026-11-27 against the November 2026 workbooks):**

- ONS publishes Average Weekly Earnings by SIC section only as **not seasonally adjusted** series. Seasonally adjusted figures (EARN01) exist only for broad sectors, so the UK uses NSA for every industry rather than mixing bases.
- **EARN03** (`/datasets/averageweeklyearningsbyindustryearn03`, file `earn03<mon><yyyy>.xls`), sheet **`1. NSA ind monthly figs`**: one column triplet per section, sub-headed `Average Weekly Earnings` / `Bonuses` / `Arrears`, with a row whose first cell is `CDID`, then monthly rows labelled `"2000 Jan"` … `"2026 Sep (p)"` (`(p)` = provisional). There is no "Regular Pay" sheet; regular pay = AWE − Bonuses − Arrears. Bonuses and arrears are "of which" components of AWE, so this subtraction is correct for every section, including J, M, N and R.
- EARN03 splits Manufacturing into C1–C6. The single Manufacturing triplet (`K55I`/`K55J`/`K55K`) comes from **EARN02** (`/datasets/averageweeklyearningsbysectorearn02`), sheet **`4. NSA sect monthly figs`**, same layout.
- The `/timeseries/<cdid>/emp/data` JSON endpoint also serves these CDIDs, but rounds to whole pounds and needs 57 requests. The sync reads the two workbooks instead.
- Months publish with a ~2-month lag (September 2026 data on 17 November 2026).

**US source (verified 2026-11-27 against the BLS v2 API):**

- BLS CES seasonally adjusted Average Weekly Earnings of All Employees (data type `11`). `CES5552000011` (Finance & Insurance), `CES5553000011` (Real Estate), and `CES6561000011` (Educational Services) do not exist, SA or NSA. Finance and teaching use the broader supersector series instead (`CES5500000011` Financial Activities, `CES6500000011` Private Education & Health Services), with a chart note naming the broader series. Property has no US series and becomes UK-only.
- `CES1000000011` is Mining **and Logging**; `CES1021000011` (Mining) is the closer match for `energy-oil-gas-jobs`.

| `tag` (URL slug)                         | Display Label                        | UK SIC 2007 Section                          | UK CDIDs (AWE / Bonuses / Arrears) | US Sector                                                                   | BLS CES Series (SA, $/wk) |
| :--------------------------------------- | :----------------------------------- | :------------------------------------------- | :--------------------------------- | :-------------------------------------------------------------------------- | :------------------------ |
| `it-jobs` _(existing)_                   | IT & Communications                  | **J** — Information & communication          | `K5E9` / `K5EA` / `K5EB`           | **51** — Information                                                        | `CES5000000011`           |
| `accounting-finance-jobs` _(existing)_   | Finance & Insurance                  | **K** — Financial & insurance activities     | `K58I` / `K58J` / `K58K`           | Financial Activities supersector (NAICS 52–53) _(broader)_                  | `CES5500000011`           |
| `professional-services-jobs` _(new)_     | Professional, Scientific & Technical | **M** — Professional, scientific & technical | `K5EC` / `K5ED` / `K5EE`           | **54** — Professional & Technical Services                                  | `CES6054000011`           |
| `healthcare-nursing-jobs` _(existing)_   | Healthcare & Social Assistance       | **Q** — Human health & social work           | `K58U` / `K58V` / `K58W`           | **62** — Health Care & Social Assistance _(private only)_                   | `CES6562000011`           |
| `teaching-jobs` _(existing)_             | Education                            | **P** — Education                            | `K58R` / `K58S` / `K58T`           | Private Education & Health Services (NAICS 61–62) _(broader, private only)_ | `CES6500000011`           |
| `trade-construction-jobs` _(existing)_   | Construction & Trades                | **F** — Construction                         | `K583` / `K584` / `K585`           | **23** — Construction                                                       | `CES2000000011`           |
| `manufacturing-jobs` _(existing)_        | Manufacturing                        | **C** — Manufacturing (EARN02)               | `K55I` / `K55J` / `K55K`           | **31–33** — Manufacturing                                                   | `CES3000000011`           |
| `retail-jobs` _(existing)_               | Retail Trade                         | **G (45, 47)** — Retail trade & repairs      | `K589` / `K58A` / `K58B`           | **44–45** — Retail Trade                                                    | `CES4200000011`           |
| `wholesale-jobs` _(new)_                 | Wholesale Trade                      | **G (46)** — Wholesale trade                 | `K586` / `K587` / `K588`           | **42** — Wholesale Trade                                                    | `CES4142000011`           |
| `logistics-warehouse-jobs` _(existing)_  | Transport & Warehousing              | **H** — Transport & storage                  | `K58F` / `K58G` / `K58H`           | **48–49** — Transportation & Warehousing                                    | `CES4300000011`           |
| `hospitality-catering-jobs` _(existing)_ | Hospitality & Food Services          | **I** — Accommodation & food services        | `K58C` / `K58D` / `K58E`           | **72** — Accommodation & Food Services                                      | `CES7072000011`           |
| `property-jobs` _(existing, UK only)_    | Real Estate & Property               | **L** — Real estate activities               | `K58L` / `K58M` / `K58N`           | _null (no BLS AWE series for NAICS 53)_                                     | _null_                    |
| `energy-oil-gas-jobs` _(existing)_       | Mining, Oil & Gas                    | **B** — Mining & quarrying (incl. oil & gas) | `K57D` / `K57E` / `K57F`           | **21** — Mining, Quarrying, and Oil & Gas                                   | `CES1021000011`           |
| `utilities-jobs` _(new)_                 | Energy & Utilities                   | **D & E** — Electricity, gas & water supply  | `K57Y` / `K57Z` / `K582`           | **22** — Utilities                                                          | `CES4422000011`           |
| `arts-entertainment-jobs` _(new)_        | Arts, Entertainment & Recreation     | **R** — Arts, entertainment & recreation     | `K5EI` / `K5EJ` / `K5EK`           | **71** — Arts, Entertainment & Recreation                                   | `CES7071000011`           |
| `business-support-jobs` _(new)_          | Administrative & Support Services    | **N** — Administrative & support services    | `K5EF` / `K5EG` / `K5EH`           | **56** — Administrative & Support Services                                  | `CES6056000011`           |
| `charity-voluntary-jobs` _(existing)_    | Non-Profit & Other Services          | **S** — Other service activities             | `K58X` / `K58Y` / `K58Z`           | **81** — Other Services                                                     | `CES8000000011`           |
| `public-sector-jobs` _(new, UK only)_    | Public Administration & Defence      | **O** — Public administration & defence      | `K58O` / `K58P` / `K58Q`           | _null (BLS CES is private-sector only)_                                     | _null_                    |
| `agriculture-jobs` _(new, UK only)_      | Agriculture, Forestry & Fishing      | **A** — Agriculture, forestry & fishing      | `K57A` / `K57B` / `K57C`           | _null (BLS CES excludes agriculture)_                                       | _null_                    |

UK: 19 industries. US: 16 industries.

**Dropped / consolidated Adzuna category slugs and 301 redirect targets (`DROPPED_INDUSTRY_REDIRECTS`):**

| Dropped Slug                    | Reason Dropped / Consolidated              | 301 Redirect Target under `/insights/industry-trends/` |
| :------------------------------ | :----------------------------------------- | :----------------------------------------------------- |
| `engineering-jobs`              | Consolidated into SIC Section M / NAICS 54 | `/insights/industry-trends/professional-services-jobs` |
| `legal-jobs`                    | Consolidated into SIC Section M / NAICS 54 | `/insights/industry-trends/professional-services-jobs` |
| `consultancy-jobs`              | Consolidated into SIC Section M / NAICS 54 | `/insights/industry-trends/professional-services-jobs` |
| `scientific-qa-jobs`            | Consolidated into SIC Section M / NAICS 54 | `/insights/industry-trends/professional-services-jobs` |
| `pr-advertising-marketing-jobs` | Consolidated into SIC Section M / NAICS 54 | `/insights/industry-trends/professional-services-jobs` |
| `creative-design-jobs`          | Consolidated into SIC Section R / NAICS 71 | `/insights/industry-trends/arts-entertainment-jobs`    |
| `social-work-jobs`              | Consolidated into SIC Section Q / NAICS 62 | `/insights/industry-trends/healthcare-nursing-jobs`    |
| `travel-jobs`                   | Overlaps Hospitality (I) and Transport (H) | `/insights/industry-trends/hospitality-catering-jobs`  |
| `maintenance-jobs`              | Facilities / repair function               | `/insights/industry-trends/trade-construction-jobs`    |
| `admin-jobs`                    | Administrative function                    | `/insights/industry-trends/business-support-jobs`      |
| `domestic-help-cleaning-jobs`   | Facilities / support function              | `/insights/industry-trends/business-support-jobs`      |
| `sales-jobs`                    | Cross-industry job function                | `/insights/industry-trends` _(hub)_                    |
| `customer-services-jobs`        | Cross-industry job function                | `/insights/industry-trends` _(hub)_                    |
| `hr-jobs`                       | Cross-industry job function                | `/insights/industry-trends` _(hub)_                    |
| `graduate-jobs`                 | Seniority / entry-level job type           | `/insights/industry-trends` _(hub)_                    |
| `part-time-jobs`                | Work schedule, not an industry             | `/insights/industry-trends` _(hub)_                    |
| `other-general-jobs`            | Unclassified catch-all bucket              | `/insights/industry-trends` _(hub)_                    |
| `unknown`                       | Internal fallback tag                      | `/insights/industry-trends` _(hub)_                    |

- **Country gaps:** a surviving industry with no data for the host's country (`property-jobs`, `public-sector-jobs`, `agriculture-jobs` on a USA host) 301-redirects to the hub and is left out of that host's sitemap.
- **Search Console pre-flight:** task 1.4 checks 90-day impressions/clicks for every dropped slug (and `property-jobs` on `.com`) before the redirect targets are coded.
- **SSR 301 execution:** in `app/pages/insights/industry-trends/[industry].vue`, before the `!matchedIndustry` 404, check `resolveDroppedIndustryRedirect(tag)` and the country gap, then `await navigateTo(target, { redirectCode: 301 })`.
- **Chart notes:** `IndustryDefinition.us` carries `privateSectorNote?: true` (`teaching-jobs`, `healthcare-nursing-jobs`) and `broaderSeriesLabel?: string` (`accounting-finance-jobs`, `teaching-jobs`). In the USA region, `IndustryTrendsChart.vue` shows `insights.chart.usPrivateEmployersNote` and `insights.chart.usBroaderSeriesNote` for the shown industries. UK copy states that figures are annualized, not seasonally adjusted regular pay.
- `GET /api/market-data/categories?country=gb|us` returns `{ results: getIndustriesForCountry(country).map(({ tag, label }) => ({ tag, label })) }` from memory with no external call.

### D3. Monthly official industry earnings ingestion (`server/utils/industryTrendsSync.ts`)

1. **`syncUkIndustryTrends(options?: { force?: boolean })`:**
   - **Discover & fetch:** fetch the EARN03 and EARN02 dataset pages, take the `/file?uri=…/current/<name>.xls` link from each, download both workbooks, and read them with the installed `xlsx` package.
   - **Parse:** in each sheet, find the row whose first cell is `CDID`, map each configured CDID to its column, and read monthly rows whose label matches `/^(\d{4}) ([A-Z][a-z]{2})( \(p\))?$/` as `YYYY-MM`. Regular pay = AWE − Bonuses − Arrears, annualized as `Math.round(weekly × 52)`. Keep the newest 36 months.
   - **Validation (fail-closed):** every configured UK industry (19) must be present, each with ≥12 valid months and every value in `[10_000, 250_000]`. Otherwise throw before writing, naming the first missing CDID.
   - **Delta check:** read `industry_trends_meta/gb`. If not `force`, `meta.latestMonth === newestMonth`, and `meta.industryCount === 19`, skip the industry writes, update `{ lastCheckedAt, lastError: null }`, return `skipped: true`.
   - **Write:** otherwise batch-write `industry_trends/gb_${tag}` = `{ country: 'gb', categoryTag, label, sicSection, history, lookupCount, updatedAt }` and `industry_trends_meta/gb` = `{ source: 'ons_awe', country: 'gb', seasonallyAdjusted: false, latestMonth, industryCount, lastSyncedAt, lastCheckedAt, lastError: null }`.
   - **Revisions:** ONS revises recent months in later releases. A release that only revises (no new month) is picked up on the next new month or a forced sync; that lag is accepted.
2. **`syncUsIndustryTrends(options?: { force?: boolean })`:**
   - **Fetch:** one POST to `https://api.bls.gov/publicAPI/v2/timeseries/data/` with every configured CES series (16), `startyear: String(currentYear - 3)`, `endyear: String(currentYear)`, and `registrationkey: config.blsApiKey` (private `runtimeConfig`). BLS v2 allows 50 series per request and 500 requests per day.
   - **Parse:** each series' `data` (`period` `'M01'`…`'M12'` → `YYYY-MM`; skip `M13`), `Math.round(parseFloat(value) × 52)`, sorted ascending.
   - **Validation (fail-closed):** `status === 'REQUEST_SUCCEEDED'`, and every configured series present with ≥12 valid months in `[15_000, 350_000]`. BLS returns `REQUEST_SUCCEEDED` even when some series IDs don't exist (it just omits them), so the series-count check is the one that catches a bad ID.
   - **Delta check & write:** same as UK against `industry_trends_meta/us` (`source: 'bls_ces'`, `seasonallyAdjusted: true`, `industryCount === 16`).
3. **Fault isolation & redaction:**
   - `runIndustryTrendsSync(options)` runs both via `Promise.allSettled`.
   - A failing source records `lastError: redactCredentials(err.message)` (§9.6; strips `registrationkey`) on its meta doc and leaves its `industry_trends` docs untouched.
   - `invalidateIndustryTrendsCache()` runs whenever either source writes.
   - **Cron:** `GET /api/cron/sync-trends` runs daily at `0 6 * * *` (`vercel.json`), guarded by `verifyCronSecret(event)`. It emails a Resend summary only when a source wrote a new month or failed, and always logs the outcome.

### D4. SOC → industry mapping (`shared/utils/socIndustryMap.ts`), salary and benchmark only

- **Scope:** only the salary and benchmark flows, which already resolve a SOC code. The jobs page takes its industry from `?category=` via `getIndustryByTag`, or `null` (see Context: its only consumer is `useRecruiterCards`, which `recruiter-deprecation-and-regional-explorer` deletes).
- **Source data, verified at pre-flight (task 1.5), not assumed here:**
  - UK: an official ONS table of employment by SOC 2020 code × SIC 2007 section (candidates: Census 2021 occupation × industry tables, which cover England and Wales only; or an APS/LFS occupation × industry table, which covers the UK). Task 1.5 records the exact table, its URL, geography, and which SOC level it reports.
  - US: the BLS National Employment Matrix (occupation × industry), whose download format task 1.5 records.
  - If no usable table exists for a country, the map for that country holds only sub-major/major group defaults written by hand and reviewed in the PR, and anything else falls back to `null` rather than a guess.
- **Generation:** `scripts/build-soc-industry-map.ts` reads the downloaded tables and emits `shared/utils/socIndustryMap.data.ts` (the modal industry per code, mapped to `INDUSTRIES` tags; codes whose modal section has no tag are omitted). The generated file is committed and added to `coverage.exclude` as a static lookup table (§8).
- **Lookup (`resolveIndustryFromSoc(country, soc)`):** exact code (4-digit UK / `XX-XXXX` US) → minor group (3-digit / `XX-XX`) → major group (2-digit / `XX`) → `null`. Returns `{ tag, label } | null`. No network, no Firestore.
- **Coverage check:** task 1.5 counts the real `uk_job_groups` and `usa_job_groups` codes, and task 2.2's test asserts every one of them resolves to a tag or a deliberate `null`.
- **Integration:** `resolveRole.ts` adds `industry` to `RoleResolution`; `useLocationEngine` sets `adzunaCategory` (name kept until `recruiter-deprecation-and-regional-explorer`) to `resolveIndustryFromSoc(country, matchedIdCode)?.label ?? null`, dropping the first-listing label.

### D5. Data cleanup & collection renaming (`scripts/purge-adzuna-data.ts`)

Adzuna's terms require deleting Adzuna-sourced data on termination. Per §10, the reversible steps (copy, code cutover) are separated from the destructive purge, with a dry run first.

1. **Collection naming:**
   - `adzuna_industry_trends` → **`industry_trends`** (plus **`industry_trends_meta`** for per-source sync status).
   - `adzuna_categories` → **retired and deleted** (replaced by `shared/utils/industries.ts` and the runtime TTL config).
   - `adzuna_jobs_cache` → **`market_jobs_cache`**; `adzuna_distribution_cache` → **`market_distribution_cache`**.
2. **Copy before deploy, purge after:**
   - **`--dry-run` (default):** counts docs in all four `adzuna_*` collections; breaks down both caches by `data.provider` (`reed`, `jooble`, `adzuna`, missing); lists `adzuna_jobs_cache` docs with `is_admin_verified === true && gov_id_code != null` and whether that synonym is already in `{uk,usa}_job_groups`; reports `industry_trends` doc counts per country.
   - **`--copy` (run immediately before deploy):** copies non-expired docs with `data.provider in ['reed', 'jooble']` from each `adzuna_*_cache` to its `market_*_cache` (500 per batch, idempotent `set`), clamping `expiresAt` to at most `now + liveCachePrimaryTtlDays`. For admin-verified Adzuna docs, writes a stub `{ gov_id_code, is_admin_verified: true }` with no listing or salary data. Without this step every live search goes cold at deploy and the first day of UK traffic all hits Reed.
   - **`--execute` (after deploy and a successful forced trends sync):** refuses unless `industry_trends` holds all 19 UK and 16 US docs; re-runs the copy for any docs written between `--copy` and the deploy; then batch-deletes (500/commit) every doc in the four `adzuna_*` collections and prints the final counts (0 each).

### D6. Cross-change edits applied to active `openspec/changes/`

1. **`reed-percentiles-and-geo-cascade`:**
   - **UK quota refusal / Reed failure:** with no stale cache entry, return no live data (`live: null`, ONS baselines); never fall back to Adzuna.
   - **US provider chain:** Careerjet → Jooble, both via `buildTieredJobResponse`, so USA also gets percentiles, `sampleSize`, and single-flight deduplication.
   - **Cache collections & TTLs:** `market_jobs_cache` / `market_distribution_cache` with `liveCachePrimaryTtlDays` (default 7) and `liveCacheFallbackTtlHours` (24h). Pre-warm refreshes keys missing or expiring within the next 24 hours.
   - **Task 6.2** edits `Section/Market/Comparison.vue`, renamed from `Section/Adzuna/Comparison.vue` by task 5.8 here.
2. **`server-side-mca-engine`:** `computeBenchmark` reads `{ histogram, mean, count, provider }` from `/api/market-data/salary`; references `market_*_cache` and `sanitizeMarketData`.
3. **`amiunderpaid-seo-funnel`:** the `/data-sources` rewrite (task 5.4) keeps the ONS AWE-by-industry, BLS OEWS and BLS CES cards and names Reed (UK) and Careerjet & Jooble (US) as live providers, with no Adzuna.

### D7. Provider terms and privacy

- **Terms check before code (task 1.6):** Careerjet's and Jooble's publisher terms must allow (a) caching responses for up to `liveCachePrimaryTtlDays`, (b) deriving and displaying salary statistics (histogram, mean, percentiles) from listings, and (c) use on a revenue-generating site. Adzuna is being removed for exactly this kind of gap, so a "no" on any point stops the change for a user decision.
- **Privacy:** forwarding each US visitor's IP address and user agent to Careerjet is new personal-data sharing. `privacy-policy.vue` and its i18n copy name Careerjet as a recipient, what is sent, and why (Careerjet's fraud prevention), alongside Reed and Jooble.

## Risks / Trade-offs

- **[Risk] Careerjet has an IP allowlist set on the key.** Vercel functions use dynamic egress IPs. Pre-flight 1.1 checks the partner dashboard (or tests from a preview deployment). At runtime a Careerjet failure falls over to Jooble, then BLS baselines.
- **[Risk] ONS changes the workbook layout.** The parser finds columns by CDID, not position, and validates that every configured series is present with plausible values before writing; on failure it keeps the last good data and records `lastError`.
- **[Risk] BLS retires or renames a series.** BLS still returns `REQUEST_SUCCEEDED`; the all-series check fails the US source loudly instead of silently shrinking the chart.
- **[Risk] Purging `adzuna_jobs_cache` deletes an admin-verified title → SOC match.** `--dry-run` lists them and `--copy` preserves a stripped `{ gov_id_code, is_admin_verified: true }` stub.
- **[Trade-off] UK is not seasonally adjusted; US is.** ONS publishes no SA series by section. Each chart shows one country, and the UK copy says "not seasonally adjusted", so the bases are never mixed on one chart.
- **[Trade-off] US finance and teaching use broader supersectors.** BLS publishes no AWE series for NAICS 52 or 61 alone. The chart note names the broader series.
- **[Trade-off] Weekly earnings × 52 is not an annual salary.** It matches the annual scale used elsewhere on the platform; the copy says figures are annualized from monthly weekly-earnings releases.

## Migration Plan

1. Pre-flight (tasks.md §1): Careerjet key and allowlist, provider terms, ONS workbooks and CDIDs, BLS series, Search Console, SOC source tables, and `purge-adzuna-data.ts --dry-run`.
2. Run `purge-adzuna-data.ts --copy` so `market_*_cache` is warm.
3. Deploy the code.
4. Trigger `POST /api/admin/sync-trends` (`{ force: true }`) from `/admin/admin-actions`; confirm `industry_trends_meta/{gb,us}` show `lastError: null` and `/insights/industry-trends` renders ≥12 months for both countries.
5. Run `purge-adzuna-data.ts --execute`; confirm all four `adzuna_*` collections hold 0 documents.
6. Remove `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` from Vercel Production and Preview.
