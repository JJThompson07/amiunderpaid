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
  - **Adzuna Extraction**: Extract inline Adzuna logic from `jobs.ts`/`salary.ts` into `server/utils/adzuna.ts` as `fetchAdzunaJobs` (search endpoint) and `fetchAdzunaHistogram` (histogram endpoint), mirroring `fetchReedData`/`fetchJoobleData` so both endpoints can call Adzuna symmetrically whether serving as primary (US) or fallback (UK).
  - **Adzuna Title-Only Specificity**: Replace `what: titleStr` with `title_only: titleStr` (Tier 1), falling back to `title_only: extractSearchAnchorPhrase(titleStr)` (Tier 2) if Tier 1 returns fewer than 3 salaried results.
  - **Jooble Anchor-Phrase Specificity**: `fetchJoobleData` sends `extractSearchAnchorPhrase(title)` as `keywords` rather than the full raw title, reducing description noise on US searches. Jooble remains USA-only and is never invoked for UK traffic.

- **2. Search Specificity & Role Relevance Filtering (`server/utils/searchRelevance.ts`)**:
  - Implement a dedicated search relevance scoring and filtering engine:
    - **Tokenization & Stop-Word Stripping**: Normalize titles (lowercase, strip noise words like "of", "and", "&", "the", "in", "for", "to", "at", "by", "with").
    - **Seniority & Role-Hierarchy Guardrails**: Categorize seniority levels (Executive, Head/Director, Manager/Lead, Mid/Professional, Junior/Entry). If the search query contains a specific seniority anchor (e.g. "Head" in "Group Head of Finance"), reject listings with conflicting or lower seniority nouns (e.g. "Accountant", "Assistant", "Junior", "Analyst") that lack leadership modifiers.
    - **Token Overlap & Match Thresholds**: Require strict token presence (100% token match for 1-2 word queries; >= 66% token overlap + seniority match for 3+ word queries).
    - **Domain Stemming**: Support standard inflections (e.g. `financial` <-> `finance`, `accounting` <-> `accountant`, `development` <-> `developer`).
    - **Search Anchor Phrase Extraction**: Export `extractSearchAnchorPhrase(searchTitle: string): string`, which strips leading non-seniority modifiers (e.g. "Group", "Senior", "Global", department qualifiers) and returns the core `[seniority anchor] + [role noun]` phrase (e.g. "Group Head of Finance" -> "Head of Finance").
  - Apply this relevance filter to jobs fetched from Reed (and fallback providers) before computing statistics and returning listing results.

- **3. Statistical Outlier Trimming & Spread Reduction (`shared/utils/math.ts` & `server/utils/reed.ts`)**:
  - Add salary sanity bounds to eliminate unparsed daily/hourly rates or placeholder listings (< £15k / $25k for full-time annual).
  - Implement Interquartile Range (IQR) outlier trimming (`[Q1 - 1.5 * IQR, Q3 + 1.5 * IQR]`) when computing `mean` and `histogram` buckets from raw salary samples, removing extreme skew and tightening salary spreads to reflect true market ranges.

- **4. Provider-Aware Caching Policy & Seamless Deployment Migration (`server/api/market-data/jobs.ts` & `server/api/market-data/salary.ts`)**:
  - **TTL Alignment**: Primary provider responses (Reed for UK, Adzuna for USA) receive standard 30-day cache TTL (or category-specific TTL from Firestore `adzuna_category`); fallback responses receive 24-hour TTL.
  - **Region-Aware Fallback Predicate**: Update `isFallbackProvider` in `jobs.ts` and `salary.ts` to `countryCode === 'gb' ? provider !== 'reed' : provider !== 'adzuna'`.
  - **Cache Versioning (`v2-`)**: Prefix cache keys generated by `generateCacheKey` with `v2-` so that on deployment, previously cached Adzuna entries are cleanly bypassed and new searches immediately fetch fresh Reed data.
  - **Stale Provider Invalidation**: When reading from cache, if a UK request encounters a cached document where `provider !== 'reed'`, treat it as a cache miss and fetch fresh data from Reed, ensuring no legacy Adzuna entries persist on UK searches.

- **5. Local Dev Provider Toggle & Fixture Alignment (`app/components/AmIDevProviderToggle.vue`, `server/utils/fallback.ts`)**:
  - Update `AmIDevProviderToggle.vue` to reflect the updated provider hierarchy (UK: Auto [Reed -> Adzuna], Reed, Adzuna; USA: Auto [Adzuna -> Jooble], Adzuna, Jooble).
  - Provide test mock fixtures for both primary and fallback paths across all supported providers.

### Scope & Non-Goals

- **In Scope**:
  - Geographic routing update in `server/api/market-data/jobs.ts` and `server/api/market-data/salary.ts`.
  - Extracting Adzuna fetch logic into `server/utils/adzuna.ts` (`fetchAdzunaJobs`, `fetchAdzunaHistogram`).
  - Pure server-side search relevance filtering utility in `server/utils/searchRelevance.ts`.
  - Quoted anchor-phrase querying in `server/utils/reed.ts`.
  - IQR salary outlier filtering in `shared/utils/math.ts` and `server/utils/reed.ts`.
  - Updating cache TTL logic, adding `v2-` cache key versioning, and invalidating stale UK cache records.
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
- `adzuna-adapter`: Updates Adzuna integration to serve as the FALLBACK market data provider for UK traffic and primary for USA traffic, with `title_only` specificity support.
- `jooble-api-fallback`: Updates Jooble's query construction to use the extracted anchor phrase rather than the full raw search title.
- `market-data-caching`: Updates cache expiry rules (30-day primary, 24-hour fallback), introduces `v2-` cache key versioning, and adds stale provider invalidation on read for UK searches.
- `dev-provider-toggle`: Updates development-only provider override options and behavior to support testing Reed as primary and Adzuna as fallback in the UK.

## Impact

- **Server Endpoints & Utilities**:
  - `server/api/market-data/jobs.ts`
  - `server/api/market-data/salary.ts`
  - `server/utils/fallback.ts`
  - `server/utils/reed.ts`
  - `server/utils/adzuna.ts` (currently only `generateCacheKey`; gains `fetchAdzunaJobs`/`fetchAdzunaHistogram` and `v2-` cache key prefix)
  - `server/utils/jooble.ts`
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
