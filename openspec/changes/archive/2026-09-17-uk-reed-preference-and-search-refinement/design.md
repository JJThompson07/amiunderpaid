# Design: UK Search API Reed Preference & Search Specificity Refinement

## Context

Currently, the market data gateway (`server/api/market-data/jobs.ts` and `server/api/market-data/salary.ts`) routes all requests to Adzuna as the primary provider, falling back to Reed (for UK) or Jooble (for USA) only when Adzuna throws an error (429, 403, 404) or returns zero results. In addition:

- Upstream job board APIs perform broad full-text keyword matching across job descriptions.
- The server processes all returned jobs without title relevance or seniority hierarchy filtering. A search for a leadership role like "Group Head of Finance" often pulls in mid-level roles like "Group Financial Accountant" (salary ~£50k) alongside executive roles (salary ~£120k).
- Unfiltered listings and misparsed salaries (e.g. daily rates parsed as annual salaries) distort the mean salary and create an artificially wide distribution spread.

## Goals / Non-Goals

**Goals:**

- Make Reed.co.uk the primary market data provider for all UK requests (`country: gb`), with Adzuna as the seamless fallback.
- Maintain Adzuna as the primary provider for USA requests (`country: us`), with Jooble as the seamless fallback.
- Implement a pure server-side title relevance scoring engine (`server/utils/searchRelevance.ts`) that prevents seniority mismatches and role confusion.
- Implement statistical outlier trimming (sanity bounds + Interquartile Range / IQR filtering) to eliminate extreme salary noise and reduce spread.
- Align caching policies: 30-day (or category-based) TTL for primary providers (Reed in UK, Adzuna in USA) and 24-hour TTL for fallback providers.
- Maintain full test coverage (>80% per-file) across all modified and new utilities and endpoints.

**Non-Goals:**

- Altering the frontend client response schemas (`JobSearchResponse`, `SalaryDistributionResponse`).
- Modifying government SOC benchmark taxonomy matching (`useMarketData.ts`, `useMacroData.ts`, `useMicroData.ts`).

## Decisions

### 1. Gateway Provider Routing Architecture

- **Choice**: Structure the provider fetch pipeline in `server/api/market-data/jobs.ts` and `server/api/market-data/salary.ts` by region:
  - **UK (`gb`)**: Attempt `fetchReedData` first. If Reed yields zero filtered results or fails (network/quota/500), fall back to Adzuna.
  - **USA (`us`)**: Attempt Adzuna first. If Adzuna yields zero results or fails (429/403/404/500), fall back to `fetchJoobleData`.
- **Verified precondition**: `server/utils/adzuna.ts` was checked against the current repo and contains only `generateCacheKey` — no `fetchAdzunaData` exists today. The Adzuna HTTP call currently lives inline inside `fetchFromProviders` in `jobs.ts`/`salary.ts`, used unconditionally as the primary path. This decision requires first extracting that inline logic into `server/utils/adzuna.ts` as `fetchAdzunaJobs` (search endpoint) / `fetchAdzunaHistogram` (histogram endpoint) — mirroring the existing `fetchReedData`/`fetchJoobleData` shape — so the gateway can call Adzuna symmetrically as either primary (US) or fallback (UK) instead of having its logic hardwired into one code path.
- **Alternatives Considered**: Creating separate endpoint files per country (rejected: adds routing duplication; keeping a unified gateway preserves client transparency).

### 2. Search Relevance Scoring & Seniority Hierarchy Guardrails (`server/utils/searchRelevance.ts`)

- **Choice**: Implement an isolated, pure TypeScript utility that evaluates candidate listings:
  - **Token Normalization**: Strip common noise words (`"of"`, `"and"`, `"&"`, `"the"`, `"in"`, `"for"`, `"to"`, `"at"`, `"by"`, `"with"`) and punctuation.
  - **Seniority Tiers**:
    - `Executive`: `chief`, `cfo`, `ceo`, `cto`, `coo`, `cmo`, `vp`, `president`
    - `Head/Director`: `head`, `director`, `partner`, `principal`
    - `Manager/Lead`: `manager`, `lead`, `supervisor`, `controller`
    - `Mid/Core`: `accountant`, `engineer`, `analyst`, `consultant`, `specialist`, `developer`, `designer`, `officer`, `auditor`, `executive` (UK title usage)
    - `Junior/Entry`: `assistant`, `junior`, `trainee`, `intern`, `graduate`, `apprentice`, `associate`
  - **Seniority Constraint**: When the search query contains an explicit leadership anchor (e.g. `"head"` in `"Group Head of Finance"`), candidate listings MUST contain a compatible leadership anchor or role noun. Listings whose primary noun is a lower tier (e.g. `"Accountant"` without `"Head"` or `"Director"`) are disqualified.
  - **Token Overlap Score**: Require 100% token presence for 1-2 word queries and >= 66% token overlap for 3+ word queries.
  - **Domain Stemming**: Standardize common variations (`financial` <-> `finance`, `accounting` <-> `accountant`, `development` <-> `developer`).
  - **Search Anchor Phrase Extraction**: Export `extractSearchAnchorPhrase(searchTitle: string): string`, reusing the same seniority-tier classification, which strips a _leading run_ of tokens drawn from a scope-modifier denylist and returns the remainder of the title verbatim, from the first seniority-tier token onward.
    - **`SCOPE_MODIFIERS`** (evidence-grounded, organized by category — see verification below):
      - Geographic/territorial: `global`, `international`, `worldwide`, `regional`, `national`, `territory`, `area`, `emea`, `apac`, `latam`, `uk`, `us`
      - Organizational/business scope: `group`, `divisional`, `corporate`, `enterprise`, `commercial`, `central`, `strategic`
      - Contractual/engagement mode: `interim`, `fractional`, `acting`, `contract`, `permanent`, `freelance`
      - Intensifier: `senior`
    - **Deliberately excluded**: `junior`, `associate`, `lead`, `principal`, `head`, `chief`, `director`. These are already members of the seniority-tier vocabulary itself (Head/Director = `head, director, partner, principal`; Executive = `chief, ...`; Manager/Lead = `..., lead, ...`; Junior/Entry = `..., junior, ..., associate`) — the signal the anchor-detection scan searches _for_. Including them in the strippable set would let the algorithm strip the very seniority anchor the seniority-hierarchy guardrail depends on to function (e.g. collapsing `"Head of Finance"` toward `"Finance"`, destroying the tier signal the whole proposal exists to enforce). `senior` is safe to keep: it appears in no tier list — a `"Senior Accountant"` and an `"Accountant"` are both Mid/Core tier, `senior` is purely an intensifier, not a tier signal.
    - **Safety rule**: locate the first token matching any seniority tier. If _every_ token before it is on `SCOPE_MODIFIERS`, strip them. If even one pre-token is unrecognized (e.g. a domain word like "Finance" in `"Finance Director"`), strip nothing and return the title unchanged. This is deliberately conservative: an unrecognized leading pattern falls back to full-title behavior rather than risk stripping a meaningful word. Both the relevance filter and Reed's Tier 1 query (§3) consume this one function, so "what counts as the anchor of a title" is defined once.
    - **Worked examples**: `"Group Head of Finance"` → pre-token `group` is a recognized modifier → strips to `"Head of Finance"`. `"Finance Director"` → pre-token `finance` is not a modifier → unchanged. `"Group Finance Director"` → pre-tokens `group, finance` — `finance` is unrecognized → unchanged.
    - **Evidence**: `group`, `senior`, `commercial`, `uk`, `interim` sourced from real Reed titles observed during live verification; `fractional` confirmed live on 2026-09-17.
- **Alternatives Considered**: Regex-only filtering (rejected: too brittle for multi-word queries with variable word orders like "Head of Finance - Group" vs "Group Head of Finance").

### 3. Tiered Reed Querying & Specificity

- **Choice**:
  - In `server/utils/reed.ts`, compute `anchorPhrase = extractSearchAnchorPhrase(fullTitle)`. If `anchorPhrase !== fullTitle`, query Reed with **both phrases quoted and OR'd**: `keywords: '"${fullTitle}" OR "${anchorPhrase}"'`. If extraction was a no-op (`anchorPhrase === fullTitle`), query with just `'"${fullTitle}"'` — an OR of two identical phrases is redundant.
  - Apply the relevance filter on returned jobs (the seniority guardrail still rejects any mismatched results the phrase match let through).
  - If Tier 1 returns fewer than 3 relevant jobs with salaries, execute Tier 2: a broad unquoted search on the full title, with strict post-fetch relevance filtering.
- **Live verification (2026-09-17, real Reed API, UK region)** — tested multiple query strategies for "Group Head of Finance" before committing to this design:
  - Quoted anchor phrase alone or with full title: 410 clean results (100/100 sampled titles genuinely contain "Head of Finance"; zero off-tier noise).
- **Alternatives Considered**: Only unquoted search (rejected: returns thousands of noisy description matches from Reed). Quoting the full raw search title alone, as originally drafted (rejected: verified live to collapse to 0-1 results per query).

### 3b. Tiered Adzuna Querying & Specificity (`server/utils/adzuna.ts`)

- **Choice**:
  - In `fetchAdzunaJobs`/`fetchAdzunaHistogram`, replace the current `what: titleStr` param with `title_only: titleStr` as Tier 1.
  - If Tier 1 returns fewer than 3 results with valid salaries, Tier 2: retry with `title_only: extractSearchAnchorPhrase(titleStr)` (the same function built for Reed's Tier 1, now shared across two providers).
  - Apply `filterAndRankJobsByRelevance` and `trimSalaryOutliersIqr` to the result regardless of which tier matched, same as Reed.
- **Live verification (2026-09-17, real Adzuna API, UK region)**: `title_only=Group Head of Finance` returned 13 clean results, all senior finance titles with clean salaries.
- **Alternatives Considered**: Keeping `what` (rejected: matches full ad text, not title-restricted). `what_phrase` (rejected: live-verified broken on this account).

### 3c. Jooble Querying — Anchor-Phrase Input (Reversed Tiering Direction)

- **Choice**: `fetchJoobleData` queries with `keywords: extractSearchAnchorPhrase(title)` — the _anchor phrase_, not the full raw title. This is the opposite of Reed's and Adzuna's Tier 1 because Jooble's matching behavior runs in the opposite direction: shorter is cleaner, longer is noisier. Jooble remains USA-only (`us` fallback), never UK.
- **Live verification (2026-09-17, real Jooble API)**: Anchor phrase returned 3044 clean results vs 11,169 noisy results for the full raw title.

### 4. Statistical Outlier Salary Trimming & Spread Reduction

- **Choice**:
  - **Sanity Bounds**: Filter out full-time annual salaries < £15,000 / $25,000 (often misclassified hourly/daily rates) or > £1,000,000.
  - **IQR Trimming**: When calculating statistics from raw salary samples (if sample size >= 5):
    - Compute $Q_1$ (25th percentile) and $Q_3$ (75th percentile), $IQR = Q_3 - Q_1$.
    - Exclude salaries outside $[Q_1 - 1.5 \times IQR, Q_3 + 1.5 \times IQR]$.
    - Calculate `mean` and `buildHistogramBuckets` from the trimmed sample.
- **Alternatives Considered**: Hardcoded salary caps per role (rejected: impossible to maintain across thousands of distinct job titles; IQR dynamically adapts to each role).

### 5. Provider Caching Policy & Seamless Deployment Migration

- **Choice**:
  - **TTL Rules**: When the regional primary provider fulfills the request (Reed for UK, Adzuna for USA), set `expiresAt` to `now + cacheDays` (default 30 days, or category TTL). When the regional fallback provider fulfills the request (Adzuna for UK, Jooble for USA), set `expiresAt` to `now + 24 hours`.
  - **Region-Aware Fallback Predicate**: `jobs.ts:294` and `salary.ts:241` currently compute `isFallbackProvider = !!cleanData.provider && cleanData.provider !== 'adzuna'`. Both call sites must change this predicate to be region-aware: `countryCode === 'gb' ? cleanData.provider !== 'reed' : cleanData.provider !== 'adzuna'`.
  - **Cache Versioning (`v2-` prefix)**: Update `generateCacheKey` in `server/utils/adzuna.ts` to prefix generated cache keys with `v2-` (e.g. `v2-gb--group-head-of-finance`). This guarantees that upon deployment, all searches cleanly bypass stale legacy Adzuna cache records and immediately populate fresh Reed-backed results without requiring manual Firestore database deletion.
  - **Stale Provider Invalidation**: When evaluating cached documents on read in `jobs.ts` and `salary.ts`, if a UK request (`country: gb`) encounters a document with `provider !== 'reed'`, treat it as a cache miss, immediately fetch fresh Reed data, and overwrite the document.

## Risks / Trade-offs

- **[Risk: Strict filtering leaves zero jobs for niche or obscure job titles]**
  → _Mitigation_: Tiered search progression: Tier 1 (Reed exact quote on the extracted anchor phrase + filter) → Tier 2 (Reed broad keyword on the full title + filter) → Tier 3 (Adzuna fallback). If all providers return zero jobs, the endpoint returns a clean 404/empty response so frontend gracefully handles fallback to government macro baselines.

- **[Risk: Reed API quota or rate limiting in UK]**
  → _Mitigation_: Any Reed HTTP error (429, 403, 500) or 0-result response immediately triggers fallback to Adzuna without crashing the request.

- **[Risk: Part-time jobs filtered out by full-time salary floor]**
  → _Mitigation_: The sanity salary floor scales based on `jobType` (e.g. £15,000 for full-time, £7,500 for part-time).
