# Proposal: UK Search API Reed Preference & Search Specificity Refinement

## Why

Recruitment team feedback identified two critical data accuracy issues in live job market searches:
1. **Provider Data Quality in the UK**: Current live data from Adzuna in the UK frequently exhibits quality and consistency discrepancies compared to Reed.co.uk's direct jobseeker listings. Setting Reed as the primary provider for UK searches (with Adzuna as fallback) aligns the system with the highest-fidelity UK job data source.
2. **Search Term Specificity & Salary Pollution**: Broad full-text search matching across job descriptions frequently returns tangentially related or lower-seniority roles (e.g. searching for executive roles like "Group Head of Finance" returns mid-level roles like "Group Financial Accountant" or "Finance Analyst"). Because accountant roles pay significantly less (£45k-£65k) than head of finance roles (£100k-£150k+), this broad matching severely pollutes the calculated mean salary, histogram distribution, and benchmark percentiles, creating an artificially wide spread.

Implementing UK-first Reed routing combined with intelligent server-side title relevance filtering, seniority hierarchy guardrails, and statistical outlier trimming directly solves these issues, ensuring returned jobs and salary distributions precisely reflect the searched role.

## What Changes

- **1. UK Primary Provider Routing (`server/api/market-data/jobs.ts` & `server/api/market-data/salary.ts`)**:
  - **UK Traffic (`gb`)**: Attempt to fetch live job listings and salary distributions primarily from the **Reed.co.uk API** (`fetchReedData`). If Reed returns zero valid results or encounters an upstream API failure/timeout, seamlessly fall back to **Adzuna API**.
  - **USA Traffic (`us`)**: Maintain existing routing: attempt **Adzuna API** primarily, falling back to **Jooble API** (`fetchJoobleData`) on zero results or API failure.
  - Make `jobs.ts` and `salary.ts` orchestrate primary-to-fallback routing dynamically based on region.
  - **Correction from initial drafting**: `server/utils/adzuna.ts` currently contains only `generateCacheKey` — there is no existing `fetchAdzunaData` function; the Adzuna HTTP call is inlined directly inside `fetchFromProviders` in `jobs.ts`/`salary.ts`. Extract that inline logic into `server/utils/adzuna.ts` as `fetchAdzunaJobs` (search endpoint) and `fetchAdzunaHistogram` (histogram endpoint), mirroring the existing `fetchReedData`/`fetchJoobleData` pattern, so both endpoints can call Adzuna symmetrically whether it's serving as primary (US) or fallback (UK).
  - **Adzuna title-only specificity** (applies whether Adzuna is serving as UK fallback or USA primary): replace the current `what: titleStr` param with `title_only: titleStr` (Tier 1), falling back to `title_only: extractSearchAnchorPhrase(titleStr)` (Tier 2, same function §2 defines for Reed) if Tier 1 returns fewer than 3 salaried results. **Verified live against the Adzuna API**: `title_only` performs genuine title-restricted, AND-of-words matching (13 clean results for the full title `"Group Head of Finance"`, 359 for the anchor `"Head of Finance"`, both on-title; appending an unmatched word confirmed AND semantics by dropping the count to 0). The originally-assumed exact-phrase parameter, `what_phrase`, is confirmed broken on this account/API version (returned topically unrelated results) and is not used anywhere in this design.
  - **Jooble query construction reverses direction vs. Reed/Adzuna**: `fetchJoobleData` sends `extractSearchAnchorPhrase(title)` as `keywords`, not the full raw title. Live-verified this is the right direction for Jooble specifically: the full raw title (`"Group Head of Finance"`) returned 11,169 results with real noise (unrelated trades/logistics postings), versus 3044 clean results for the anchor phrase alone. A control test also confirmed Jooble's `keywords` has no word-presence requirement (appending a nonsense word left results unchanged) and doesn't parse quotes as phrase syntax (quoted/unquoted identical) — so the post-fetch relevance filter (§2) remains the primary specificity mechanism, and the anchor phrase is a free reduction in the noise that filter has to work through. Jooble remains USA-only, exactly as today — it is never invoked for UK traffic.

- **2. Search Specificity & Role Relevance Filtering (`server/utils/searchRelevance.ts`)**:
  - Implement a dedicated search relevance scoring and filtering engine:
    - **Tokenization & Stop-Word Stripping**: Normalize titles (lowercase, strip noise words like "of", "and", "&", "the", "in", "for", "to", "at", "by", "with").
    - **Seniority & Role-Hierarchy Guardrails**: Categorize seniority levels (Executive, Head/Director, Manager/Lead, Mid/Professional, Junior/Entry). If the search query contains a specific seniority anchor (e.g. "Head" in "Group Head of Finance"), reject listings with conflicting or lower seniority nouns (e.g. "Accountant", "Assistant", "Junior", "Analyst") that lack leadership modifiers.
    - **Token Overlap & Match Thresholds**: Require strict token presence (100% token match for 1-2 word queries; >= 66% token overlap + seniority match for 3+ word queries).
    - **Domain Stemming**: Support standard inflections (e.g. `financial` <-> `finance`, `accounting` <-> `accountant`, `development` <-> `developer`).
    - **Search Anchor Phrase Extraction**: Export `extractSearchAnchorPhrase(searchTitle: string): string`, which strips leading non-seniority modifiers (e.g. "Group", "Senior", "Global", department qualifiers) and returns the core `[seniority anchor] + [role noun]` phrase (e.g. "Group Head of Finance" -> "Head of Finance"). This is consumed by Reed's Tier 1 query builder (§3 below) so the exact-phrase search and the relevance filter share one definition of what the "anchor" of a title is, rather than each guessing independently.
  - Apply this relevance filter to jobs fetched from Reed (and fallback providers) before computing statistics and returning listing results.

- **3. Statistical Outlier Trimming & Spread Reduction (`shared/utils/math.ts` & `server/utils/reed.ts`)**:
  - Add salary sanity bounds to eliminate unparsed daily/hourly rates or placeholder listings (< £15k / $25k for full-time annual). **Verified against live Reed data** (search: `"Head of Finance"`, 2026-09-17): the raw sample mixes genuine annual salaries (£55k-£150k) with unconverted day/hourly rates parsed as if annual (e.g. `500-650`, `27-30`, `512.06-700`) and at least one outright data-entry typo (`80000-800000`), which drags a naive mean down to ~£73k against a true population that clusters £70k-£90k — confirming this trimming step is load-bearing, not speculative.
  - Implement Interquartile Range (IQR) outlier trimming (`[Q1 - 1.5 * IQR, Q3 + 1.5 * IQR]`) when computing `mean` and `histogram` buckets from raw salary samples, removing extreme skew and tightening salary spreads to reflect true market ranges.

- **4. Provider-Aware Caching Policy (`server/api/market-data/jobs.ts` & `server/api/market-data/salary.ts`)**:
  - Primary provider responses (Reed for UK, Adzuna for USA) receive standard 30-day cache TTL (or category-specific TTL from Firestore `adzuna_category`).
  - Fallback provider responses (Adzuna for UK fallback, Jooble for USA fallback) receive a 24-hour cache TTL so transient fallback data expires quickly.
  - **Existing code note**: `jobs.ts:294` and `salary.ts:241` currently compute `isFallbackProvider` as `cleanData.provider !== 'adzuna'`, which is only correct because Adzuna is unconditionally primary today. Once Reed becomes UK primary, this literal predicate must become region-aware (`countryCode === 'gb' ? provider !== 'reed' : provider !== 'adzuna'`), or a successful Reed UK response will be wrongly treated as a fallback and capped at the 24-hour TTL.

- **5. Local Dev Provider Toggle & Fixture Alignment (`app/components/AmIDevProviderToggle.vue`, `server/utils/fallback.ts`)**:
  - Update `AmIDevProviderToggle.vue` to reflect the updated provider hierarchy (UK: Auto [Reed -> Adzuna], Reed, Adzuna; USA: Auto [Adzuna -> Jooble], Adzuna, Jooble).
  - Provide test mock fixtures for both primary and fallback paths across all supported providers.

### Scope & Non-Goals

- **In Scope**:
  - Geographic routing update in `server/api/market-data/jobs.ts` and `server/api/market-data/salary.ts`.
  - Extracting the currently-inline Adzuna fetch logic out of `jobs.ts`/`salary.ts` into `server/utils/adzuna.ts` (`fetchAdzunaJobs`, `fetchAdzunaHistogram`).
  - Pure server-side search relevance filtering utility in `server/utils/searchRelevance.ts`, including the shared anchor-phrase extraction used by both the relevance filter and Reed's query builder.
  - Anchor-phrase exact-quote querying in `server/utils/reed.ts` (quoting the extracted anchor phrase, not the full raw search title — see design.md's live-verification note).
  - IQR salary outlier filtering in `shared/utils/math.ts` and `server/utils/reed.ts`.
  - Updating cache TTL logic in `jobs.ts` and `salary.ts` to recognize Reed as UK primary, including fixing the `isFallbackProvider` predicate to be region-aware.
  - Dev provider toggle UI adjustments in `AmIDevProviderToggle.vue`.
  - Comprehensive unit test coverage (>80% per-file) across all modified and new files.
- **Non-Goals**:
  - Modifying government benchmark SOC taxonomy matching (`resolveUkIdentity` / `resolveUsaIdentity` / Algolia dictionary).
  - Altering the unified client `JobSearchResponse` or `SalaryDistributionResponse` contract.

## Capabilities

### New Capabilities
- `search-relevance-and-specificity`: Defines server-side job title relevance scoring, seniority hierarchy consistency checking, token overlap evaluation, stop-word stripping, and IQR salary outlier trimming for market data searches.

### Modified Capabilities
- `reed-api-fallback`: Updates Reed integration to serve as the PRIMARY market data provider for UK traffic (with exact-phrase and keyword querying and statistical calculations), with fallback to Adzuna.
- `adzuna-adapter`: Updates Adzuna integration to serve as the FALLBACK market data provider for UK traffic and primary for USA traffic, with `title_only` specificity support (verified live; `what_phrase` explicitly not used — see design.md §3b).
- `jooble-api-fallback`: Updates Jooble's query construction to use the extracted anchor phrase rather than the full raw search title (verified live to reduce noise — see design.md §3c).
- `market-data-caching`: Updates cache expiry rules so that primary provider results (Reed for UK, Adzuna for USA) receive standard cache TTL, while fallback results (Adzuna for UK, Jooble for USA) receive a 24-hour TTL.
- `dev-provider-toggle`: Updates development-only provider override options and behavior to support testing Reed as primary and Adzuna as fallback in the UK.

## Impact

- **Server Endpoints & Utilities**:
  - `server/api/market-data/jobs.ts`
  - `server/api/market-data/salary.ts`
  - `server/utils/fallback.ts`
  - `server/utils/reed.ts`
  - `server/utils/adzuna.ts` (currently only `generateCacheKey`; gains `fetchAdzunaJobs`/`fetchAdzunaHistogram`)
  - `server/utils/jooble.ts` (query input changes from full title to `extractSearchAnchorPhrase(title)`)
  - `server/utils/searchRelevance.ts` (new)
  - `shared/utils/math.ts`
- **Frontend Components**:
  - `app/components/AmIDevProviderToggle.vue`
- **Tests**:
  - `server/utils/tests/searchRelevance.spec.ts` (new)
  - `server/utils/tests/reed.spec.ts`
  - `server/utils/tests/adzuna.spec.ts` (new)
  - `server/utils/tests/jooble.spec.ts`
  - `server/utils/tests/fallback.spec.ts`
  - `server/api/market-data/tests/jobs.spec.ts`
  - `server/api/market-data/tests/salary.spec.ts`
  - `shared/utils/tests/math.spec.ts`

`app/composables/useJobs.ts` was listed as impacted in an earlier draft but is not: it only forwards `devProviderOverride`/`country` params to the endpoints unchanged and requires no functional edit under this proposal.
