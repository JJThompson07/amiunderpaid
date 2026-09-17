# Tasks

## 1. Search Relevance & Specificity Engine

- [ ] 1.1 Create `server/utils/searchRelevance.ts`:
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
- [ ] 1.2 Create unit tests in `server/utils/tests/searchRelevance.spec.ts`:
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

- [ ] 2.1 Update `shared/utils/math.ts`:
  - Implement `trimSalaryOutliersIqr(salaries: number[]): number[]` using the Interquartile Range (IQR) method (`[Q1 - 1.5 * IQR, Q3 + 1.5 * IQR]`) when sample size >= 5.
  - Implement sanity salary bounds (`filterSanitySalaries(salaries: number[], jobType?: string)`) to eliminate unparsed hourly/daily rates (< £15,000 / $25,000 for full-time) or placeholder extremes.
- [ ] 2.2 Update unit tests in `shared/utils/tests/math.spec.ts`:
  - Test IQR filtering removes extreme outliers from skewed arrays.
  - Test sanity salary bounds scale correctly for full-time vs part-time.
  - Verify all tests pass with >80% coverage.

## 3. Reed API Integration & Tiered Querying

- [ ] 3.1 Update `server/utils/reed.ts`:
  - Enhance `fetchReedData` to perform tiered search:
    - Tier 1: Call `anchorPhrase = extractSearchAnchorPhrase(title)`. If `anchorPhrase !== title`, query Reed with both phrases quoted and OR'd: `keywords: '"${title}" OR "${anchorPhrase}"'`. If extraction was a no-op (`anchorPhrase === title`), query with just `'"${title}"'` (an OR of two identical phrases is redundant). **Verified live against the Reed API** (see `design.md` §3): quoting the full raw title alone collapses to 0-1 results per query since Reed's quotes match the full free-text ad body rather than the title, and rare multi-word compounds rarely appear verbatim in body text; OR-ing in the shorter anchor phrase recovers a clean, usable result set (410 results, 100/100 sampled titles on-anchor) without narrowing coverage the full-title branch would have provided on its own. Also verified Reed's `keywords` field parses real boolean `OR` between quoted phrases (order-independent, confirmed via inclusion-exclusion math on non-overlapping phrases), not a no-op.
    - Apply `filterAndRankJobsByRelevance` (using the full original search title, not just the anchor) and `trimSalaryOutliersIqr`.
    - If filtered jobs with valid salaries < 3, execute Tier 2 (unquoted full-title keyword search) with strict post-fetch relevance filtering.
  - Update `processReedData` to accept the search title and calculate `mean` and `buildHistogramBuckets` using the filtered and IQR-trimmed salary sample.
- [ ] 3.2 Update unit tests in `server/utils/tests/reed.spec.ts`:
  - Test Tier 1 builds `'"${title}" OR "${anchorPhrase}"'` when extraction changes the title, and `'"${title}"'` alone when it doesn't.
  - Test tiered query execution (Tier 1 OR-quoted search falling back to Tier 2 unquoted full-title search when sparse).
  - Test relevance filtering and outlier trimming in `processReedData`.
  - Verify all tests pass with >80% coverage.

## 4. Adzuna Fetch Extraction & Title-Only Specificity

- [ ] 4.1 Extract the Adzuna HTTP-fetch logic currently inlined in `fetchFromProviders` (`server/api/market-data/jobs.ts` and `server/api/market-data/salary.ts`) into `server/utils/adzuna.ts`, alongside the existing `generateCacheKey`:
  - `fetchAdzunaJobs(title, location, jobType, contractType, countryCode, category?)`: builds `AdzunaSearchParams`, calls `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/1`, runs `sanitizeAdzunaData`, throws a 404-shaped error on zero results (mirroring current inline behavior).
  - `fetchAdzunaHistogram(title, location, countryCode, category?)`: same shape for the `/histogram` endpoint.
  - Both read `adzunaAppId`/`adzunaAppKey` from `useRuntimeConfig()` (unchanged from current behavior) and throw a `500` on missing credentials.
  - Update `jobs.ts`/`salary.ts` to call these instead of the inline `$fetch` block, so Adzuna can be invoked symmetrically as either primary (US) or fallback (UK) — mirroring the existing `fetchReedData`/`fetchJoobleData` call shape.
- [ ] 4.2 Add tiered title-only specificity to `fetchAdzunaJobs`/`fetchAdzunaHistogram`:
  - Replace the current `what: titleStr` param with `title_only: titleStr` (the full search title) as Tier 1. **Verified live against the Adzuna API** (see `design.md` §3b): `title_only` performs genuine title-restricted, AND-of-words matching — appending an unmatched word to the query drove the result count to 0, confirming it's not fuzzy/ranked. For `"Group Head of Finance"` it returned 13 results, all genuinely on-topic senior finance titles with clean salaries (£54k-£110k), a materially better sample than the current unrestricted `what` param.
  - If Tier 1 (`title_only` on the full title) returns fewer than 3 results with valid salaries, Tier 2: retry with `title_only: extractSearchAnchorPhrase(titleStr)` (reusing the same function built for Reed in §1 — verified live: 359 results for the anchor phrase `"Head of Finance"`, still title-restricted, still clean).
  - **Do not use `what_phrase`.** It was proposed in earlier drafts as Adzuna's exact-phrase equivalent to Reed's quoting, but live-tested and confirmed broken on this account/API version: `what_phrase=Head of Finance` returned entries with zero topical relevance (`Zonal Head - Prayagraj`, `Procurement Officer`). Do not implement any code path depending on it.
  - Apply `filterAndRankJobsByRelevance` and `trimSalaryOutliersIqr` to Adzuna results the same as Reed's, as the final safety net regardless of which tier matched.
- [ ] 4.3 Create unit tests in `server/utils/tests/adzuna.spec.ts` (new):
  - Test `fetchAdzunaJobs`/`fetchAdzunaHistogram` construct correct params (location mapping, job/contract type flags, category), including `title_only` replacing `what`.
  - Test the Tier 1 -> Tier 2 (anchor phrase) fallback when Tier 1 returns fewer than 3 salaried results.
  - Test zero-result and missing-credential error paths.
  - Verify >80% coverage on the new file.

## 5. Fallback Provider Routing & Dev Provider Toggle

- [ ] 5.1 Update `server/utils/fallback.ts`:
  - Update `executeMarketFallback(title, location, countryCode, type, contract, category?)` to route UK (`gb`) to `fetchAdzunaJobs`/`fetchAdzunaHistogram` (from §4) and USA (`us`) to Jooble fallback.
  - Provide mock fixtures for all providers (`reed`, `adzuna`, `jooble`) for e2e tests.
  - Update `fetchJoobleData` to query with `keywords: extractSearchAnchorPhrase(title)` (the anchor phrase) instead of the full raw title — **reversed tiering direction from Reed/Adzuna**. Live-tested against a real US query: the full raw title (`"Group Head of Finance"`) returned 11,169 results with real noise (`Supervisor`/`Lead`/`Driver` trades postings mixed into the top 20), versus 3044 clean, on-topic results for the anchor phrase (`"Head of Finance"`) alone. A control test confirmed Jooble's `keywords` field has no word-presence requirement at all (appending a nonsense word to the query left the result count and top results completely unchanged) — unlike Adzuna's `title_only`, there's no AND semantics to make extra words earn their keep, so shorter input is strictly better. Also confirmed quotes are not parsed as phrase syntax (quoted/unquoted identical), so no Reed-style exact-match trick is available either — the post-fetch `filterAndRankJobsByRelevance` filter remains the primary specificity safeguard for this provider regardless of which string is sent.
- [ ] 5.2 Update unit tests in `server/utils/tests/fallback.spec.ts` and `server/utils/tests/jooble.spec.ts`:
  - Assert UK (`gb`) fallback routes to Adzuna, never to Jooble.
  - Assert USA (`us`) fallback routes to Jooble, never to Reed/Adzuna's UK path.
  - Assert `fetchJoobleData` sends `extractSearchAnchorPhrase(title)` as `keywords`, not the full raw title.
  - Regression guard: assert `executeMarketFallback` never invokes `fetchJoobleData` for `countryCode === 'gb'`. Motivated by a live-testing finding (not a production bug — the existing country-alias normalization already prevents this): Jooble's `location` field silently returns topically unrelated results for an unrecognized value (e.g. a bare `"UK"` string) rather than erroring, so a future regression routing UK traffic to Jooble would fail silently rather than loudly.
  - Verify mock fixture helper methods.
- [ ] 5.3 Update `app/components/AmIDevProviderToggle.vue`:
  - Ensure provider options reflect UK (Auto [Reed -> Adzuna], Reed, Adzuna) and USA (Auto [Adzuna -> Jooble], Adzuna, Jooble) — Jooble is never offered as a UK option.

## 6. Market Data Endpoints & Provider-Aware Caching

- [ ] 6.1 Update `server/api/market-data/jobs.ts`:
  - Implement regional provider routing in `fetchFromProviders`:
    - If `countryCode === 'gb'`: primary is Reed (`fetchReedData`), fallback is Adzuna (`fetchAdzunaJobs` from §4) on 0 results or Reed failure.
    - If `countryCode === 'us'`: primary is Adzuna (`fetchAdzunaJobs`), fallback is Jooble (`fetchJoobleData`) on 429/403/404 or 0 results.
  - Fix the primary/fallback cache-TTL predicate to be region-aware. Currently (line 294) `isFallbackProvider = !!cleanData.provider && cleanData.provider !== 'adzuna'` — this only works because Adzuna is unconditionally primary today. Change to `isFallbackProvider = countryCode === 'gb' ? cleanData.provider !== 'reed' : cleanData.provider !== 'adzuna'`, otherwise a successful Reed UK response is wrongly treated as fallback and capped at 24h.
  - Support `devProviderOverride` for `reed`, `adzuna`, `jooble`, `auto`.
- [ ] 6.2 Update unit tests in `server/api/market-data/tests/jobs.spec.ts`:
  - Test UK requests query Reed primarily and fall back to Adzuna on error/zero results.
  - Test USA requests query Adzuna primarily and fall back to Jooble on error/zero results.
  - Test caching TTL rules for primary vs fallback providers, explicitly covering: Reed succeeding as UK primary gets the standard `cacheDays` TTL (not 24h); Adzuna succeeding as UK fallback gets 24h; Adzuna succeeding as USA primary gets the standard `cacheDays` TTL; Jooble succeeding as USA fallback gets 24h.
  - Verify all tests pass with >80% coverage.
- [ ] 6.3 Update `server/api/market-data/salary.ts`:
  - Implement regional provider routing in `fetchFromProviders`:
    - If `countryCode === 'gb'`: primary is Reed (`fetchReedData`), fallback is Adzuna (`fetchAdzunaHistogram` from §4).
    - If `countryCode === 'us'`: primary is Adzuna (`fetchAdzunaHistogram`), fallback is Jooble (`fetchJoobleData`).
  - Apply the same region-aware `isFallbackProvider` fix as §6.1 (currently line 241 in `salary.ts`).
  - Support `devProviderOverride` for `reed`, `adzuna`, `jooble`, `auto`.
- [ ] 6.4 Update unit tests in `server/api/market-data/tests/salary.spec.ts`:
  - Test UK requests query Reed primarily and fall back to Adzuna on error/empty histogram.
  - Test USA requests query Adzuna primarily and fall back to Jooble on error/empty histogram.
  - Test caching TTL rules for primary vs fallback providers (same four cases as §6.2).
  - Verify all tests pass with >80% coverage.

## 7. Verification & Quality Gate

- [ ] 7.1 Run full verification suite `pnpm test:verify` (combining linting, typechecking, 80% per-file test coverage gate, e2e tests, and Firestore rules tests) and confirm all checks pass with zero errors.
