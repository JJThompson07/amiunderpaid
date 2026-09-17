# Tasks

## 1. Search Relevance & Specificity Engine

- [x] 1.1 Create `server/utils/searchRelevance.ts`:
  - Implement token normalization and stop-word stripping (remove `"of"`, `"and"`, `"&"`, `"the"`, `"in"`, `"for"`, `"to"`, `"at"`, `"by"`, `"with"`).
  - Implement seniority hierarchy classification (`Executive`, `Head/Director`, `Manager/Lead`, `Mid/Professional`, `Junior/Entry`).
  - Implement seniority conflict detection: when the search query has an explicit seniority anchor (e.g. `"head"` in `"Group Head of Finance"`), reject candidate listings whose primary noun indicates a lower/conflicting tier (e.g. `"Group Financial Accountant"`, `"Finance Analyst"`, `"Finance Assistant"`) without leadership qualification.
  - Implement token overlap calculation: require 100% token presence for 1-2 word queries and >= 66% token overlap for 3+ word queries.
  - Implement domain stemming for common role variations (`financial` <-> `finance`, `accounting` <-> `accountant`, `development` <-> `developer`).
  - Export `extractSearchAnchorPhrase(searchTitle: string): string`:
    - Define `SCOPE_MODIFIERS` grouped by category:
      - Geographic/territorial: `global`, `international`, `worldwide`, `regional`, `national`, `territory`, `area`, `emea`, `apac`, `latam`, `uk`, `us`
      - Organizational/business scope: `group`, `divisional`, `corporate`, `enterprise`, `commercial`, `central`, `strategic`
      - Contractual/engagement mode: `interim`, `fractional`, `acting`, `contract`, `permanent`, `freelance`
      - Intensifier: `senior`
    - **Do not** add `junior`, `associate`, `lead`, `principal`, `head`, `chief`, or `director` to `SCOPE_MODIFIERS` — they are already seniority-tier vocabulary (the signal the anchor scan searches for), and stripping them would let the algorithm erase the very seniority anchor the guardrail in this same file depends on.
    - Tokenize the title (preserving original text/casing so the result is a valid literal substring, not a rejoined token list). Find the first token matching any seniority tier.
    - If every token before that index is on `SCOPE_MODIFIERS`, strip them and return the substring from the seniority token to the end, verbatim. Otherwise (an unrecognized pre-token, or no seniority-tier token found at all) return the input title unchanged — never guess.
  - Export `filterAndRankJobsByRelevance(jobs: CandidateJob[], searchTitle: string): CandidateJob[]` and `calculateTitleRelevanceScore(candidateTitle: string, searchTitle: string): number`.
- [x] 1.2 Create unit tests in `server/utils/tests/searchRelevance.spec.ts`:
  - Test exact title matches score 1.0.
  - Test leadership search rejection of mid-level titles (e.g. `"Group Head of Finance"` rejects `"Group Financial Accountant"` and `"Finance Assistant"`).
  - Test qualified leadership variations pass (e.g. `"Head of Finance & Corporate Accounting"`, `"Director of Group Finance"`).
  - Test stop-word stripping and multi-word token overlap thresholds.
  - Test `extractSearchAnchorPhrase`:
    - `"Group Head of Finance"` -> `"Head of Finance"` (recognized leading modifier stripped).
    - `"Head of Finance"` -> `"Head of Finance"` (already minimal, no-op).
    - `"Finance Director"` -> `"Finance Director"` unchanged (pre-token `"finance"` is not a recognized modifier — conservative no-strip, not an over-strip).
    - `"Group Finance Director"` -> `"Group Finance Director"` unchanged (known conservative blind spot: `"finance"` between the modifier and the seniority token blocks stripping; documented in `design.md` §3 as an accepted trade-off, not a bug).
  - Regression guard: assert `SCOPE_MODIFIERS` has no overlap with any seniority-tier word list (catches a future edit accidentally re-adding `head`/`chief`/`director`/`lead`/`principal`/`junior`/`associate` and silently disabling the anchor-detection scan).
  - Verify 100% unit test pass and >80% code coverage.

## 2. Statistical Outlier Trimming & Spread Reduction

- [x] 2.1 Update `shared/utils/math.ts`:
  - Implement `trimSalaryOutliersIqr(salaries: number[]): number[]` using the Interquartile Range (IQR) method (`[Q1 - 1.5 * IQR, Q3 + 1.5 * IQR]`) when sample size >= 5.
  - Implement sanity salary bounds (`filterSanitySalaries(salaries: number[], jobType?: string)`) to eliminate unparsed hourly/daily rates (< £15,000 / $25,000 for full-time) or placeholder extremes.
- [x] 2.2 Update unit tests in `shared/utils/tests/math.spec.ts`:
  - Test IQR filtering removes extreme outliers from skewed arrays.
  - Test sanity salary bounds scale correctly for full-time vs part-time.
  - Verify all tests pass with >80% coverage.

## 3. Reed API Integration & Tiered Querying

- [x] 3.1 Update `server/utils/reed.ts`:
  - Enhance `fetchReedData` to perform tiered search:
    - Tier 1: Call `anchorPhrase = extractSearchAnchorPhrase(title)`. If `anchorPhrase !== title`, query Reed with both phrases quoted and OR'd: `keywords: '"${title}" OR "${anchorPhrase}"'`. If extraction was a no-op (`anchorPhrase === title`), query with just `'"${title}"'`.
    - Apply `filterAndRankJobsByRelevance` (using the full original search title, not just the anchor) and `trimSalaryOutliersIqr`.
    - If filtered jobs with valid salaries < 3, execute Tier 2 (unquoted full-title keyword search) with strict post-fetch relevance filtering.
  - Update `processReedData` to accept the search title and calculate `mean` and `buildHistogramBuckets` using the filtered and IQR-trimmed salary sample.
- [x] 3.2 Update unit tests in `server/utils/tests/reed.spec.ts`:
  - Test Tier 1 builds `'"${title}" OR "${anchorPhrase}"'` when extraction changes the title, and `'"${title}"'` alone when it doesn't.
  - Test tiered query execution (Tier 1 OR-quoted search falling back to Tier 2 unquoted full-title search when sparse).
  - Test relevance filtering and outlier trimming in `processReedData`.
  - Verify all tests pass with >80% coverage.

## 4. Adzuna Fetch Extraction, Title-Only Specificity & Cache Key Versioning

- [x] 4.1 Update `server/utils/adzuna.ts`:
  - Extract Adzuna HTTP-fetch logic into `fetchAdzunaJobs` and `fetchAdzunaHistogram`.
  - Update `generateCacheKey` to prepend `v2-` version prefix (`v2-${country}-${l}-${t}${c ? `-cat-${c}` : ''}`) so that deployment automatically isolates fresh searches from legacy unversioned Adzuna cache records.
  - Add `title_only: titleStr` Tier 1 query construction, falling back to `title_only: extractSearchAnchorPhrase(titleStr)` (Tier 2) on < 3 results.
- [x] 4.2 Create unit tests in `server/utils/tests/adzuna.spec.ts`:
  - Test `generateCacheKey` outputs `v2-` prefixed keys.
  - Test `fetchAdzunaJobs`/`fetchAdzunaHistogram` construct correct params (`title_only` replacing `what`, location mapping, job/contract flags).
  - Test the Tier 1 -> Tier 2 (anchor phrase) fallback when Tier 1 returns fewer than 3 salaried results.
  - Test zero-result and missing-credential error paths.
  - Verify >80% coverage on the new file.

## 5. Fallback Provider Routing & Dev Provider Toggle

- [x] 5.1 Update `server/utils/fallback.ts`:
  - Update `executeMarketFallback(title, location, countryCode, type, contract, category?)` to route UK (`gb`) to `fetchAdzunaJobs`/`fetchAdzunaHistogram` and USA (`us`) to Jooble fallback.
  - Provide mock fixtures for all providers (`reed`, `adzuna`, `jooble`) for e2e tests.
  - Update `fetchJoobleData` to query with `keywords: extractSearchAnchorPhrase(title)`.
- [x] 5.2 Update unit tests in `server/utils/tests/fallback.spec.ts` and `server/utils/tests/jooble.spec.ts`:
  - Assert UK (`gb`) fallback routes to Adzuna, never to Jooble.
  - Assert USA (`us`) fallback routes to Jooble, never to Reed/Adzuna's UK path.
  - Assert `fetchJoobleData` sends `extractSearchAnchorPhrase(title)` as `keywords`.
  - Regression guard: assert `executeMarketFallback` never invokes `fetchJoobleData` for `countryCode === 'gb'`.
- [x] 5.3 Update `app/components/AmIDevProviderToggle.vue`:
  - Ensure provider options reflect UK (Auto [Reed -> Adzuna], Reed, Adzuna) and USA (Auto [Adzuna -> Jooble], Adzuna, Jooble).

## 6. Market Data Endpoints & Provider-Aware Caching

- [x] 6.1 Update `server/api/market-data/jobs.ts`:
  - Implement regional provider routing in `fetchFromProviders`:
    - If `countryCode === 'gb'`: primary is Reed (`fetchReedData`), fallback is Adzuna (`fetchAdzunaJobs`) on 0 results or Reed failure.
    - If `countryCode === 'us'`: primary is Adzuna (`fetchAdzunaJobs`), fallback is Jooble (`fetchJoobleData`) on 429/403/404 or 0 results.
  - Update cache-read check: for UK requests (`countryCode === 'gb'`), if cached document has `data.provider !== 'reed'`, treat as a cache miss and fetch fresh Reed data.
  - Fix the primary/fallback cache-TTL predicate to be region-aware: `isFallbackProvider = countryCode === 'gb' ? cleanData.provider !== 'reed' : cleanData.provider !== 'adzuna'`.
  - Support `devProviderOverride` for `reed`, `adzuna`, `jooble`, `auto`.
- [x] 6.2 Update unit tests in `server/api/market-data/tests/jobs.spec.ts`:
  - Test UK requests query Reed primarily and fall back to Adzuna on error/zero results.
  - Test USA requests query Adzuna primarily and fall back to Jooble on error/zero results.
  - Test stale UK provider cache invalidation on read (`provider !== 'reed'` triggers fresh fetch).
  - Test caching TTL rules for primary vs fallback providers (Reed UK primary: 30d; Adzuna UK fallback: 24h; Adzuna US primary: 30d; Jooble US fallback: 24h).
  - Verify all tests pass with >80% coverage.
- [x] 6.3 Update `server/api/market-data/salary.ts`:
  - Implement regional provider routing in `fetchFromProviders`:
    - If `countryCode === 'gb'`: primary is Reed (`fetchReedData`), fallback is Adzuna (`fetchAdzunaHistogram`).
    - If `countryCode === 'us'`: primary is Adzuna (`fetchAdzunaHistogram`), fallback is Jooble (`fetchJoobleData`).
  - Update cache-read check: for UK requests (`countryCode === 'gb'`), if cached document has `data.provider !== 'reed'`, treat as a cache miss and fetch fresh Reed data.
  - Apply region-aware `isFallbackProvider` fix.
  - Support `devProviderOverride` for `reed`, `adzuna`, `jooble`, `auto`.
- [x] 6.4 Update unit tests in `server/api/market-data/tests/salary.spec.ts`:
  - Test UK requests query Reed primarily and fall back to Adzuna on error/empty histogram.
  - Test USA requests query Adzuna primarily and fall back to Jooble on error/empty histogram.
  - Test stale UK provider cache invalidation on read.
  - Test caching TTL rules for primary vs fallback providers.
  - Verify all tests pass with >80% coverage.

## 7. Verification & Quality Gate

- [x] 7.1 Run full verification suite `pnpm test:verify` (combining linting, typechecking, 80% per-file test coverage gate, e2e tests, and Firestore rules tests) and confirm all checks pass with zero errors.
