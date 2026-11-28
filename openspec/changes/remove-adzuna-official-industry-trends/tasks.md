## 1. Pre-flight verification (CODE_STANDARDS.md §10)

- [ ] 1.1 **Careerjet Publisher API:**
  - Confirm `CAREERJET_API_KEY` exists and check the Careerjet partner dashboard for an IP allowlist on the key. Vercel functions use dynamic egress IPs, so it must be empty (or test from a Vercel preview deployment). If Careerjet requires a static allowlist, stop and ask the user.
  - Send one local request to `GET https://search.api.careerjet.net/v4/query` with `Authorization: Basic ${btoa(`${apiKey}:`)}`, `locale_code=en_US`, `keywords=software engineer`, `location=New York`, `user_ip`, `user_agent`, and `Referer: https://www.amiunderpaid.com/jobs`.
  - Record in `design.md` D1: (a) HTTP 200 with `jobs[]` containing `title`, `locations`, `company`, `url`, `salary`, `salary_min`, `salary_max`, `salary_type`; (b) whether quoted phrases in `keywords` work; (c) rate-limit headers or the documented limit; (d) the required attribution wording and link.
- [ ] 1.2 **ONS workbooks (re-check the 2026-11-27 result):** download the current EARN03 and EARN02 `.xls` files from their dataset pages. Confirm sheet `1. NSA ind monthly figs` (EARN03) and `4. NSA sect monthly figs` (EARN02) still exist, each has a row starting `CDID`, all 57 CDIDs in `design.md` D2 are present, and month labels match `"YYYY Mon"` with an optional `" (p)"`. If anything differs, update D2/D3 before coding 4.1.
- [ ] 1.3 **BLS CES series:** confirm `BLS_API_KEY` exists (or register a free v2 key). POST the 16 series in `design.md` D2 with a 2-year window and confirm `status === 'REQUEST_SUCCEEDED'` and that **all 16** come back with monthly `M01`–`M12` values (BLS omits unknown IDs while still reporting success). Add `CAREERJET_API_KEY` and `BLS_API_KEY` to Vercel Production and Preview.
- [ ] 1.4 **Search Console:** for `www.amiunderpaid.co.uk` and `www.amiunderpaid.com`, last 90 days, record impressions and clicks for every dropped slug in `design.md` D2 plus `property-jobs`, `public-sector-jobs` and `agriculture-jobs` on `.com`. Put the table in the PR description and confirm the 301 targets before coding 2.4.
- [ ] 1.5 **SOC → industry sources and Firestore audit (read-only):**
  - Find the UK and US occupation × industry tables per `design.md` D4. Record each table's name, URL, geography, release, SOC level, and file format in D4. If none is usable for a country, say so in D4 and stop for a user decision before 2.2.
  - Count the codes in production `uk_job_groups` and `usa_job_groups` by level (2/3/4-digit UK; major/minor/broad/detailed US) and record the counts in D4.
  - Count docs in `territory_category_owners` and recruiter `users` with a non-empty `coveredCategories` (both stored Adzuna labels; 0 owners on 2026-11-10 per `recruiter-deprecation-and-regional-explorer`). If either is non-zero, stop and ask the user before 2.5, because the new labels would no longer match.
  - Count docs in `adzuna_categories`, `adzuna_industry_trends`, `adzuna_jobs_cache`, `adzuna_distribution_cache`; list distinct `categoryTag` values in the first two and confirm each is in D2's surviving or dropped tables; count `adzuna_jobs_cache` docs with `is_admin_verified === true`.
- [ ] 1.6 **Provider terms:** read Careerjet's and Jooble's publisher terms and record in `design.md` D7 whether each allows (a) caching responses for 7 days, (b) deriving and displaying salary statistics from listings, (c) use on a revenue-generating site. Any "no" or "unclear": stop and ask the user.
- [ ] 1.7 Confirm `server-side-mca-engine` and `uk-geo-economics-ingestion` are merged: `server/utils/engine/resolveRole.ts`, `server/utils/engine/computeBenchmark.ts`, and `server/utils/cronAuth.ts` (`verifyCronSecret`) exist.

## 2. Industry taxonomy & SOC → industry mapping

- [ ] 2.1 `shared/utils/industries.ts`:
  - `IndustryDefinition` = `{ tag, label, uk: { sicSection, aweCdid, bonusCdid, arrearsCdid, workbook: 'earn03' | 'earn02' } | null, us: { naicsLabel, cesSeriesId, privateSectorNote?: true, broaderSeriesLabel?: string } | null }`.
  - Export `INDUSTRIES` (the 19 rows in `design.md` D2), `DROPPED_INDUSTRY_REDIRECTS` (the 18 rows), `getIndustriesForCountry(country: 'gb' | 'us' | 'UK' | 'USA')`, `getIndustryByTag(tag)`, `resolveDroppedIndustryRedirect(tag): string | null`, and `resolveIndustryCountryGap(tag, country): string | null` (hub path when the industry has no data for that country).
  - Tests `shared/utils/tests/industries.spec.ts`: UK returns 19 and US 16; `property-jobs`, `public-sector-jobs`, `agriculture-jobs` are UK-only; `privateSectorNote` on US teaching and healthcare; `broaderSeriesLabel` on US finance and teaching; every dropped slug's target; no surviving tag in `DROPPED_INDUSTRY_REDIRECTS`; country-code normalization; unknown tag → `null`.
- [ ] 2.2 SOC → industry map per `design.md` D4:
  - `scripts/build-soc-industry-map.ts` reads the tables recorded in 1.5 and writes `shared/utils/socIndustryMap.data.ts` (UK and US maps at each level). Commit the generated file and add it to `vitest.config.ts` `coverage.exclude` (§8 static lookup table).
  - `shared/utils/socIndustryMap.ts`: `resolveIndustryFromSoc(country, soc)` → exact → minor → major → `null`, returning `{ tag, label } | null`. The file header names the source tables and their releases.
  - Tests `shared/utils/tests/socIndustryMap.spec.ts`: an exact UK and US code, minor- and major-group fallbacks, an unmatched code → `null`, invalid/null/empty input, country normalization, and a fixture of every code counted in 1.5 resolving without throwing.
- [ ] 2.3 `server/api/market-data/categories.ts` (+ `tests/categories.spec.ts`): return `{ results: getIndustriesForCountry(country).map(({ tag, label }) => ({ tag, label })) }` with no external call.
- [ ] 2.4 Industry trends pages:
  - `app/pages/insights/industry-trends/[industry].vue`: before the `!matchedIndustry` 404, 301 via `navigateTo(target, { redirectCode: 301 })` when `resolveDroppedIndustryRedirect` or `resolveIndustryCountryGap` returns a target.
  - `app/pages/insights/industry-trends/index.vue`: list only `getIndustriesForCountry` for the host's country.
  - `app/components/Section/Shared/IndustryTrendsChart.vue` (+ `Section/Shared/tests/IndustryTrendsChart.spec.ts`): in the USA region, render `insights.chart.usPrivateEmployersNote` when a shown industry has `privateSectorNote`, and `insights.chart.usBroaderSeriesNote` (with the series label) when one has `broaderSeriesLabel`; render the UK "not seasonally adjusted" basis line in the UK region. Tests cover each note's presence and absence.
- [ ] 2.5 Industry on searches:
  - `server/utils/engine/types.ts` + `server/utils/engine/resolveRole.ts` (+ `tests/resolveRole.spec.ts`): add `industry: resolveIndustryFromSoc(country, soc)` to `RoleResolution`.
  - `app/composables/useLocationEngine.ts` (+ `tests/useLocationEngine.spec.ts`): `adzunaCategory` = `resolveIndustryFromSoc(country, matchedIdCode)?.label ?? null`. Tests: SOC resolves, SOC unmatched → `null`, never the first listing's label.
  - `app/composables/useJobSearchEngine.ts` (+ `tests/useJobSearchEngine.spec.ts`): `adzunaCategory` = `getIndustryByTag(category.value)?.label ?? null`. Tests: with `?category=it-jobs`, without a category, and listings labelled `'Unknown'` not leaking through.
  - `app/composables/useCategories.ts` (+ `tests/useCategories.spec.ts`): build the list from `INDUSTRIES` instead of Firestore `adzuna_categories`, keeping the old document shape. Emit one entry per industry per country it has data for: `{ id, tag, label, country }` with `id` = `uk-<tag>` or `usa-<tag>` and `country` = `'UK'` or `'USA'` (the old doc ID format), so `recruiter/territories/index.vue` (`cat.country === selectedCountry`), `territories/edit.vue` and `Territory/DashboardMatrix.vue` (`c.id === val || c.label === val`) and `recruiter/profile.vue` (dedupe by label) keep working. Keep `loadingCategories` (always `false`). Tests: 19 `UK` and 16 `USA` entries, `property-jobs` UK-only, the ID format, and each entry having all four fields.
  - `app/pages/recruiter/territories/index.vue`: drop the `adzuna_categories` comment only; the `CategoryEntry` `id`/`country` fields stay (they are now always set).

## 3. Remove Adzuna & add the Careerjet US provider

- [ ] 3.1 `nuxt.config.ts` `runtimeConfig` (§9.1–9.2):
  - Remove `adzunaAppId` and `adzunaAppKey`.
  - Add secrets `careerjetApiKey: process.env.CAREERJET_API_KEY` and `blsApiKey: process.env.BLS_API_KEY`.
  - Add `liveCachePrimaryTtlDays: Number(process.env.NUXT_LIVE_CACHE_PRIMARY_TTL_DAYS) || 7` and `liveCacheFallbackTtlHours: Number(process.env.NUXT_LIVE_CACHE_FALLBACK_TTL_HOURS) || 24`.
  - `.env.example`: remove `ADZUNA_APP_ID`/`ADZUNA_APP_KEY`; add `CAREERJET_API_KEY`, `BLS_API_KEY`, and the two optional TTL overrides with their defaults in comments.
- [ ] 3.2 Shared types and sanitization:
  - `shared/utils/market-data.ts`: `MarketDataProvider` = `'reed' | 'careerjet' | 'jooble'`; add `mean?: number` and `count?: number` to `SalaryDistributionResponse`; remove Adzuna comments.
  - `shared/utils/sanitize.ts` (+ `tests/sanitize.spec.ts`): rename `sanitizeAdzunaData` → `sanitizeMarketData`; add `redactCredentials(message)` stripping `app_id`, `app_key`, `api_key`, `affid`, `registrationkey`, and `token` query params (§9.6), with a test per param.
  - Remove Adzuna comments from `shared/utils/math.ts`, `shared/utils/uk.ts`, `shared/utils/usa.ts`.
- [ ] 3.3 Move `generateCacheKey` into `server/utils/marketCacheKey.ts` (+ `server/utils/tests/marketCacheKey.spec.ts`); update `server/api/admin/backfill-searches.post.ts` (+ `server/api/admin/tests/backfill-searches.spec.ts`) to import it and read `market_jobs_cache` / `market_distribution_cache`.
- [ ] 3.4 `server/utils/careerjet.ts` (+ `server/utils/tests/careerjet.spec.ts`) per `design.md` D1:
  - `fetchCareerjetData`, `mapCareerjetJobs` (Careerjet `url` → `redirect_url`; category from the request via `getIndustryByTag` or `unknown`), `normalizeCareerjetSalary`; Basic Auth, 6000 ms timeout, `user_ip`/`user_agent`/`Referer`, `locale_code: 'en_US'`, `contracttype`, `contractperiod`, dual-tier `Promise.allSettled`, `buildTieredJobResponse(..., 'us', 'careerjet')`. When `careerjetApiKey` is unset: 500 in production, deterministic mock when `process.dev || process.env.E2E === 'true'` (server code uses `process.dev`, §9.5; `reed.ts`/`jooble.ts` currently use `import.meta.dev`, which 3.5 also changes to `process.dev`).
  - Errors: a 429/5xx/timeout on one tier keeps the other tier's results; both failing throws a 503-mapped provider error; thrown messages pass through `redactCredentials` before logging (§9.6).
  - Tests: auth header, forwarded user context, contract/schedule mapping, each `salary_type` (full- and part-time hourly), one-bound salaries, string fallback, `url` → `redirect_url`, one tier failing, both failing, missing key in prod vs dev/E2E.
- [ ] 3.5 `server/utils/reed.ts` (+ `tests/reed.spec.ts`) and `server/utils/jooble.ts` (+ `tests/jooble.spec.ts`):
  - Both tag listings with `getIndustryByTag(category) ?? { label: 'Unknown', tag: 'unknown' }` instead of the hardcoded `'Unknown'`.
  - Change the dev/E2E gate from `import.meta.dev` to `process.dev` (§9.5).
  - `jooble.ts` delegates filtering, IQR trimming, and histogram to `buildTieredJobResponse`.
  - Remove Adzuna comments.
- [ ] 3.6 `server/utils/fallback.ts` (+ `tests/fallback.spec.ts`): `executeMarketFallback` runs only for `us` (Jooble); for `gb` it throws **503** (§9.4). `getMockFallbackJobs` / `getMockFallbackHistogram` include `mean` and `count` and accept `'reed' | 'careerjet' | 'jooble'`.
- [ ] 3.7 `server/api/market-data/jobs.ts` (+ `tests/jobs.spec.ts`) and `server/api/market-data/salary.ts` (+ `tests/salary.spec.ts`):
  - Read/write `market_jobs_cache` and `market_distribution_cache`; treat `provider === 'adzuna'`, a missing `expiresAt`, a UK doc with `provider !== 'reed'`, or (in `salary.ts`) a doc where `typeof data.mean !== 'number' || typeof data.count !== 'number'` as a miss. The last guard catches any `{ histogram, provider }`-only doc, which would otherwise make `computeBenchmark` return no live percentile.
  - Pass `userIp`, `userAgent`, and the canonical `Referer` to `fetchCareerjetData` for US requests. They are arguments to `fetchFromProviders` but MUST NOT be part of its `defineCachedFunction` `getKey`: a per-user key would split the 1-hour in-memory cache by visitor and remove its stampede protection.
  - UK: Reed only. `count === 0` → empty Reed response cached for `liveCacheFallbackTtlHours`; Reed throws → 503 `'Market data temporarily unavailable.'`.
  - US: Careerjet; on failure or `count === 0`, Jooble. 503 only when every provider tried **threw** (network, HTTP error, timeout). When the providers answered but found nothing (Careerjet 0 then Jooble 0, or Careerjet threw and Jooble returned 0), return 200 with the empty response cached for `liveCacheFallbackTtlHours`, so the jobs page renders `NoData` with `noindex` instead of an error page.
  - Primary hits with listings cache for `liveCachePrimaryTtlDays` (default 7); remove the `adzuna_categories` lookup and the `cacheDays = 30` default.
  - `salary.ts` returns `{ histogram, mean, count, provider }`; `tryReuseJobsCacheHistogram` reuses fresh `market_jobs_cache` entries for all three providers.
  - Tests: each TTL branch, each stale-provider miss, a distribution doc missing `mean`/`count` → miss, `getKey` identical for two requests with different IP/UA, UK zero vs error, US Careerjet → Jooble, US both zero → 200 empty, US Careerjet throws + Jooble zero → 200 empty, US both throw → 503, salary reuse per provider, no provider name in any `statusMessage` (§9.3).
- [ ] 3.8 Delete Adzuna server code:
  - Delete `server/utils/adzuna.ts`, `server/utils/adzunaHistory.ts`, `server/utils/cacheReExpiry.ts`, `server/api/admin/adzuna-locations.get.ts`, `server/api/admin/re-expire-category-cache.post.ts`, and their tests in `server/utils/tests/` and `server/api/admin/tests/`.
  - Remove `ADZUNA_LOCATION_MAP` from `server/constants/locations.ts` (+ `server/constants/tests/locations.spec.ts`).
  - `server/utils/cachePurge.ts` (+ test), `server/api/admin/seed.post.ts` (+ test), `server/api/admin/delete.post.ts` (+ test): `adzuna_*` collections → `market_jobs_cache` / `market_distribution_cache`; drop `adzuna_categories`.
  - `server/utils/tests/jobTiering.spec.ts`: replace the `'adzuna'` provider arguments with `'careerjet'`.
  - Comment-only cleanups: `server/api/market-data/update-match.post.ts` (stale `server/api/adzuna/` path header), `server/utils/searchRelevance.ts`.
  - `server/api/admin/tests/search-logs.spec.ts`, `server/api/user/tests/update-search.spec.ts`: replace Adzuna fixtures.

## 4. Official monthly industry earnings (ONS + BLS)

- [ ] 4.1 Rewrite `server/utils/industryTrendsSync.ts` (+ `server/utils/tests/industryTrendsSync.spec.ts`) per `design.md` D3:
  - `syncUkIndustryTrends(options)`: discover and download EARN03 + EARN02, locate columns by CDID, regular pay = AWE − Bonuses − Arrears, × 52, newest 36 months; all 19 industries present with ≥12 months in range or throw; delta check; batch write; meta doc with `seasonallyAdjusted: false`.
  - `syncUsIndustryTrends(options)`: one BLS POST for the 16 series; all 16 present with ≥12 months in range or throw; delta check; batch write; meta with `seasonallyAdjusted: true`.
  - `runIndustryTrendsSync(options)`: `Promise.allSettled`, lookup counts from `market_jobs_cache`, `invalidateIndustryTrendsCache()` on any write, `redactCredentials` on stored errors.
  - Errors: a 429/5xx from ONS or BLS, an ONS page with no `.xls`/`.xlsx` link, a workbook missing a CDID, and a BLS response missing one series each fail only that country, leave its docs untouched, and record `lastError`.
  - Tests (small fixture workbooks built with `xlsx` in the test, and a fixture BLS JSON): UK and US first-run backfill; dataset pages linking `.xls` and `.xlsx`; `(p)` month labels; manufacturing read from the EARN02 fixture; regular-pay subtraction; quiet day (`skipped: true`, no doc writes); new month → write + invalidation; `force: true`; each failure above; one country failing while the other writes; BLS `REQUEST_SUCCEEDED` with 15 of 16 series → failure; credential redaction.
- [ ] 4.2 `server/api/cron/sync-trends.get.ts` (+ `server/api/cron/tests/sync-trends.spec.ts`): `verifyCronSecret(event)`, `runIndustryTrendsSync({ force: false })`, Resend summary only when a source wrote or failed (a failing email send doesn't fail the run). `vercel.json`: schedule `"0 3 2 * *"` → `"0 6 * * *"`.
- [ ] 4.3 `server/api/admin/sync-trends.post.ts` (+ `server/api/admin/tests/sync-trends.spec.ts`): accept `{ force?: boolean }` (default `true` from the admin button) and return the per-source summary. Add `server/api/admin/sync-trends-status.get.ts` (+ `server/api/admin/tests/sync-trends-status.spec.ts`) returning `industry_trends_meta/{gb,us}`; admin auth as in the existing admin routes (§7), with a 401/403 test.
- [ ] 4.4 Read `industry_trends` instead of `adzuna_industry_trends` in `server/api/market-data/industry-trends.ts`, `server/utils/industryTrendsCache.ts`, and `server/routes/sitemap.xml.ts` (each + test). The sitemap lists only `getIndustriesForCountry` for the host's country.

## 5. UI, admin pages, attribution, and i18n

- [ ] 5.1 `app/components/Section/Careerjet/JobListing.vue`, mirroring `Section/Jooble/JobListing.vue`, with `data-provider="careerjet"`, `:url="sanitizeUrl(listing.redirect_url)"`, `rel="noopener noreferrer"`, and `:raw-salary="listing.raw_salary"`.
- [ ] 5.2 `app/composables/useJobs.ts` (+ `tests/useJobs.spec.ts`): use `sanitizeMarketData`; default `provider` to `'reed'` (UK) / `'careerjet'` (US); include `mean` and `count` on `distributionData`.
- [ ] 5.3 Provider attribution and listings on `app/pages/salary/[title]/[country]/[[location]].vue`, `app/pages/benchmark/[title]/[country]/[[location]].vue` (if it still exists after `site-separation`), and `app/pages/jobs/[title]/[country]/[[location]].vue`: `reed` → `https://www.reed.co.uk` (`sections.jobs.by-reed`), `careerjet` → `https://www.careerjet.com` (`sections.jobs.by-careerjet`), `jooble` → `https://jooble.org` (`sections.jobs.by-jooble`); render `SectionCareerjetJobListing` for `careerjet`.
- [ ] 5.4 Provider copy:
  - `app/components/AmIDevProviderToggle.vue`: UK `Auto`, `Reed`; USA `Auto`, `Careerjet`, `Jooble`.
  - `app/components/Section/Shared/TrustBadges.vue`: UK ONS + Reed; USA BLS + Careerjet + Jooble.
  - `app/pages/data-sources.vue`: live-provider tile for Reed (UK) and Careerjet & Jooble (USA); ONS AWE-by-industry and BLS CES as the industry-trends sources.
  - `app/pages/privacy-policy.vue` (`design.md` D7): replace the Adzuna section with Reed, Careerjet and Jooble; state that for US searches the visitor's IP address and browser user agent are sent to Careerjet for its fraud prevention.
- [ ] 5.5 Admin pages and navigation:
  - Delete `app/pages/admin/adzuna.vue` and its link in `app/components/AmI/NavBar.vue`.
  - `app/pages/admin/admin-actions.vue`: the "Sync Industry Trends" card describes ONS AWE by industry (UK) and BLS CES (US), shows each source's `lastSyncedAt`, `latestMonth`, `lastError` from `GET /api/admin/sync-trends-status`, and sends `{ force: true }`. Remove the re-expire-category-cache action if present.
  - `app/pages/admin/search-logs.vue`: replace the `'Adzuna'` fallback with `'-'`.
- [ ] 5.6 Remaining Adzuna UI references:
  - `app/components/BaseSearchForm.vue`: update the comment describing categories as a live Adzuna pass-through.
  - `app/components/Section/GovernmentUserSelection.vue`: keep the `adzunaCategory` prop name (renamed with `useRecruiterCards` in `recruiter-deprecation-and-regional-explorer`) and hide the industry line when it is `null`.
  - `app/composables/useRecruiterCards.ts` (+ `tests/useRecruiterCards.spec.ts`): no behaviour change; update the Adzuna fixtures and comments.
- [ ] 5.7 i18n (§6) in `i18n/locales/en-GB/` and `i18n/locales/en-US/`: remove every Adzuna reference and add Careerjet / ONS / BLS copy in `about.json`, `card.json`, `common.json`, `data-sources.json`, `faq.json`, `how-it-works.json`, `insights.json` (`insights.chart.usPrivateEmployersNote`, `insights.chart.usBroaderSeriesNote`, the UK basis line), `landing.json`, `meta.json`, `navbar.json`, `privacy-policy.json`, `sections.json` (`sections.jobs.by-careerjet`) in both locales. `cspell.config.json`: remove `adzuna`, add `careerjet` and any CDID-style words flagged. `pnpm lint` passes (`check-i18n` + cspell).
- [ ] 5.8 Rename `app/components/Section/Adzuna/{Comparison,Histogram}.vue` → `app/components/Section/Market/{Comparison,Histogram}.vue` and update `LazySectionAdzunaComparison` → `LazySectionMarketComparison` (and the Histogram usage) in the salary and benchmark pages. `reed-percentiles-and-geo-cascade` task 6.2 edits the renamed file.
- [ ] 5.9 E2E (§10: mocked endpoints only; cookie banner declined; GA/GTM blocked):
  - `e2e/job-search.spec.ts`: UK landing copy and meta description mention Reed and not Adzuna/Careerjet/Jooble; US mention Careerjet and Jooble and not Adzuna/Reed.
  - `e2e/api-fallback.spec.ts`: `devProviderOverride = 'careerjet'` renders `[data-provider="careerjet"]`.
  - A US jobs search with no `category` shows no industry; one with `category=it-jobs` does.

## 6. Firestore rules, docs, and the Adzuna data purge

- [ ] 6.1 `firestore.rules`: remove `match /adzuna_categories/{id}`; mark `industry_trends`, `industry_trends_meta`, `market_jobs_cache`, `market_distribution_cache`, and the retired `adzuna_*` collections `allow read, write: if false;`. Add matching cases to `tests/firestore.spec.ts` (`pnpm test:rules`).
- [ ] 6.2 `scripts/purge-adzuna-data.ts` per `design.md` D5: `--dry-run` (default), `--copy` (jobs cache only; never `adzuna_distribution_cache`), `--execute`. `--execute` refuses unless `industry_trends` has all 19 UK and 16 US docs, re-runs the copy, then deletes in 500-doc batches. A failed batch stops the run and prints what remains, so a re-run resumes. Log counts only, never document contents.
- [ ] 6.3 Docs:
  - `CODE_STANDARDS.md` §9.6: replace the `redactAdzunaCredentials` reference with `redactCredentials` in `shared/utils/sanitize.ts`, and Adzuna examples in §9.3 with a generic provider. If `openspec/config.yaml`'s `context:` restates either, update it in the same commit.
  - `COUNTRY_GUIDELINES.md`: replace the Adzuna-first provider table with UK Reed → ONS and US Careerjet → Jooble → BLS.
  - `README.md`: the stack line lists Reed, Careerjet and Jooble.
  - `comingUp.md`: remove or mark done any Adzuna items.

## 7. Verification and rollout

- [ ] 7.1 `grep -rni "adzuna" app server shared utils i18n e2e tests firestore.rules nuxt.config.ts .env.example cspell.config.json CODE_STANDARDS.md COUNTRY_GUIDELINES.md README.md` returns only the stale-provider cache guard (`provider === 'adzuna'`), the `adzunaCategory` prop/variable name kept for `recruiter-deprecation-and-regional-explorer`, and `scripts/purge-adzuna-data.ts`.
- [ ] 7.2 Gate: `pnpm test:verify` passes (lint incl. i18n and cspell, typecheck, 80% per-file coverage across every new and modified utility, route and composable, e2e with mocks, rules).
- [ ] 7.3 Rollout per `design.md` Migration Plan: `purge-adzuna-data.ts --dry-run` → `--copy` → deploy → forced trends sync from `/admin/admin-actions` (both meta docs `lastError: null`, ≥12 months on `/insights/industry-trends` for each country) → `--execute` (all four `adzuna_*` collections at 0) → remove `ADZUNA_APP_ID`/`ADZUNA_APP_KEY` from Vercel.
- [ ] 7.4 After deploy, request three dropped slugs and `property-jobs` on `.com` and confirm 301s to the documented targets.
