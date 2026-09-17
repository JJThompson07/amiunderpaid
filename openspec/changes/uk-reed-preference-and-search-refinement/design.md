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
  - **Search Anchor Phrase Extraction**: Export `extractSearchAnchorPhrase(searchTitle: string): string`, reusing the same seniority-tier classification, which strips a *leading run* of tokens drawn from a scope-modifier denylist and returns the remainder of the title verbatim, from the first seniority-tier token onward.
    - **`SCOPE_MODIFIERS`** (evidence-grounded, organized by category — see verification below):
      - Geographic/territorial: `global`, `international`, `worldwide`, `regional`, `national`, `territory`, `area`, `emea`, `apac`, `latam`, `uk`, `us`
      - Organizational/business scope: `group`, `divisional`, `corporate`, `enterprise`, `commercial`, `central`, `strategic`
      - Contractual/engagement mode: `interim`, `fractional`, `acting`, `contract`, `permanent`, `freelance`
      - Intensifier: `senior`
    - **Deliberately excluded**: `junior`, `associate`, `lead`, `principal`, `head`, `chief`, `director`. These are already members of the seniority-tier vocabulary itself (Head/Director = `head, director, partner, principal`; Executive = `chief, ...`; Manager/Lead = `..., lead, ...`; Junior/Entry = `..., junior, ..., associate`) — the signal the anchor-detection scan searches *for*. Including them in the strippable set would let the algorithm strip the very seniority anchor the seniority-hierarchy guardrail depends on to function (e.g. collapsing `"Head of Finance"` toward `"Finance"`, destroying the tier signal the whole proposal exists to enforce). `senior` is safe to keep: it appears in no tier list — a `"Senior Accountant"` and an `"Accountant"` are both Mid/Core tier, `senior` is purely an intensifier, not a tier signal.
    - **Safety rule**: locate the first token matching any seniority tier. If *every* token before it is on `SCOPE_MODIFIERS`, strip them. If even one pre-token is unrecognized (e.g. a domain word like "Finance" in `"Finance Director"`), strip nothing and return the title unchanged. This is deliberately conservative: an unrecognized leading pattern falls back to full-title behavior rather than risk stripping a meaningful word. Both the relevance filter and Reed's Tier 1 query (§3) consume this one function, so "what counts as the anchor of a title" is defined once.
    - **Worked examples**: `"Group Head of Finance"` → pre-token `group` is a recognized modifier → strips to `"Head of Finance"`. `"Finance Director"` → pre-token `finance` is not a modifier → unchanged. `"Group Finance Director"` → pre-tokens `group, finance` — `finance` is unrecognized → unchanged (known conservative blind spot: an ideal extraction would strip to `"Finance Director"` here, but under-stripping only forgoes a potential OR-clause benefit, never removes existing correctness, since the full-title exact-phrase branch and Tier 2's broad fallback are unaffected).
    - **Evidence**: `group`, `senior`, `commercial`, `uk`, `interim` sourced from real Reed titles observed during live verification (`Commercial Head of Finance`, `UK Head of Finance (FMCG)`, `Interim Head of Finance`, `Group Finance Manager`, `Senior Finance Business Partner`); `fractional` confirmed live on 2026-09-17 (`Fractional FD` appears as a real Reed listing title, searching `"Fractional Finance Director"` unquoted, 26 total results). Remaining geographic/contractual terms (`international`, `worldwide`, `territory`, `area`, `emea`, `apac`, `latam`, `divisional`, `enterprise`, `central`, `strategic`, `acting`, `contract`, `permanent`, `freelance`) are standard UK/US job-title conventions not individually live-verified — low risk given the safety rule above only ever costs a missed strip, never an incorrect one.
- **Alternatives Considered**: Regex-only filtering (rejected: too brittle for multi-word queries with variable word orders like "Head of Finance - Group" vs "Group Head of Finance").

### 3. Tiered Reed Querying & Specificity
- **Choice**:
  - In `server/utils/reed.ts`, compute `anchorPhrase = extractSearchAnchorPhrase(fullTitle)`. If `anchorPhrase !== fullTitle`, query Reed with **both phrases quoted and OR'd**: `keywords: '"${fullTitle}" OR "${anchorPhrase}"'`. If extraction was a no-op (`anchorPhrase === fullTitle`), query with just `'"${fullTitle}"'` — an OR of two identical phrases is redundant.
  - Apply the relevance filter on returned jobs (the seniority guardrail still rejects any mismatched results the phrase match let through).
  - If Tier 1 returns fewer than 3 relevant jobs with salaries, execute Tier 2: a broad unquoted search on the full title, with strict post-fetch relevance filtering.
- **Live verification (2026-09-17, real Reed API, UK region)** — tested multiple query strategies for "Group Head of Finance" before committing to this design:

  | Method | `keywords` sent | Total results | Title precision (sampled) |
  |---|---|---|---|
  | Unquoted full title | `Group Head of Finance` | 395 | Noisy — includes `Finance Assistant` (£25k), `Finance Analyst`, `Group Essentials Buyer` |
  | Quoted full title (original design) | `"Group Head of Finance"` | 1 | Useless — sole hit titled `Group Financial Controller`; the phrase only appears in that ad's body text, not its title |
  | Boolean AND of words | `+Head +Finance` | 1150 | Noisy — same failure mode as unquoted, larger |
  | Quoted anchor phrase alone | `"Head of Finance"` | 410 | Clean — 100/100 sampled titles genuinely contain "Head of Finance"; zero off-tier noise |
  | **Quoted full title OR anchor phrase (this design)** | `"Group Head of Finance" OR "Head of Finance"` | 410 | Same as anchor-alone in this example (see OR verification below) |

  Reed's quotes genuinely perform exact-phrase matching (confirmed: 395 -> 1 when the full title is quoted) — but the match is evaluated against the full free-text ad body, not the job title, so quoting a rare multi-word compound like "Group Head of Finance" verbatim almost never finds a real title match. Quoting the shorter, more common anchor phrase instead ("Head of Finance") reliably narrows to on-title results while keeping a usable sample size.
- **OR-syntax verification (2026-09-17)** — confirmed Reed's `keywords` field parses real boolean `OR` between quoted phrases, order-independent, rather than silently dropping one side. Using two *non-overlapping* phrases to prove it: `"Head of Finance"` alone = 410, `"Finance Director"` alone = 698, `"Head of Finance" OR "Finance Director"` = 1012 (both orders identical). This is exact inclusion-exclusion math (410 + 698 − 1012 = 96 = the overlap), which a real OR implementation must produce and a "picks one side" implementation could not. For the `"Group Head of Finance"`-style case specifically, OR-ing with `"Head of Finance"` lands at exactly 410 (same as anchor-alone) because `"Head of Finance"` is a literal substring of `"Group Head of Finance"` — anything matching the longer phrase necessarily matches the shorter one (A ⊆ B, so A ∪ B = B). The OR still earns its place in the general case: whenever `extractSearchAnchorPhrase` is *not* a strict substring of the original title (e.g. a future non-prefix modifier pattern), OR-ing both phrases gives real extra coverage with no precision cost, since both sides remain exact-phrase matches and both still pass through the relevance filter afterward.
  This also confirms the original Tier 1 (quote-the-full-title only) would have returned 0-1 results on nearly every realistic multi-word query, making it dead weight that fell through to Tier 2 on almost every request — this revision fixes that by construction.
- **Alternatives Considered**: Only unquoted search (rejected: returns thousands of noisy description matches from Reed). Quoting the full raw search title alone, as originally drafted (rejected: verified live to collapse to 0-1 results per query). Quoting the anchor phrase alone, without OR-ing the full title back in (rejected: strictly dominated by the OR version — costs nothing extra and only helps in cases where the anchor isn't a strict substring of the original title).

### 3b. Tiered Adzuna Querying & Specificity (`server/utils/adzuna.ts`)
- **Choice**:
  - In `fetchAdzunaJobs`/`fetchAdzunaHistogram`, replace the current `what: titleStr` param with `title_only: titleStr` as Tier 1.
  - If Tier 1 returns fewer than 3 results with valid salaries, Tier 2: retry with `title_only: extractSearchAnchorPhrase(titleStr)` (the same function built for Reed's Tier 1, now shared across two providers).
  - Apply `filterAndRankJobsByRelevance` and `trimSalaryOutliersIqr` to the result regardless of which tier matched, same as Reed.
- **Live verification (2026-09-17, real Adzuna API, UK region)** — unlike Reed, Adzuna has a genuine title-scoped parameter, but the parameter the original draft assumed was exact-phrase matching (`what_phrase`) turned out to be broken:

  | Method | Param sent | Count | Quality |
  |---|---|---|---|
  | Current code (unrestricted) | `what=Group Head of Finance` | 107 | Decent at a glance, but matches full text, not title-restricted |
  | Assumed exact-phrase equivalent (rejected) | `what_phrase=Group Head of Finance` | 0 (then 7 for the shorter phrase `"Head of Finance"`) | **Broken** — the 7 results for the shorter phrase were topically unrelated (`Zonal Head - Prayagraj`, `Procurement Officer`); do not use this parameter |
  | **Title-restricted, full title (Tier 1, this design)** | `title_only=Group Head of Finance` | 13 | Clean — every result a genuine senior finance title, salaries £54k-£110k, no garbage |
  | **Title-restricted, anchor phrase (Tier 2, this design)** | `title_only=Head of Finance` | 359 | Clean — broader, still title-restricted |
  | Control (confirms AND semantics) | `title_only=Head of Finance Zzznonexistentword` | 0 | Appending an unmatched word drops the count to zero — confirms `title_only` requires all words present in the title, not fuzzy/ranked matching |

  `title_only` is a real, working Adzuna feature — simpler and more reliable than the OR-of-quoted-phrases workaround Reed needed (§3), since it restricts to the title field natively rather than approximating it. `what_phrase` is not used anywhere in this design despite being documented as Adzuna's phrase-match parameter, because it demonstrably does not work as documented on this account/API version.
- **Alternatives Considered**: Keeping `what` (rejected: matches full ad text, not title-restricted, and the original proposal's problem statement is specifically about title/seniority pollution). `what_phrase` as an exact-phrase Tier 1, mirroring Reed (rejected: live-verified broken — see table above). `what_and`/`what_or` (rejected: `what_and=Head Finance` returned 15,133 results live-tested, far too broad — simple word-presence-anywhere-in-text logic, not title-aware).

### 3c. Jooble Querying — Anchor-Phrase Input (Reversed Tiering Direction)
- **Choice**: `fetchJoobleData` queries with `keywords: extractSearchAnchorPhrase(title)` — the *anchor phrase*, not the full raw title. This is the opposite of Reed's and Adzuna's Tier 1 (full title first, anchor phrase as a narrower/wider fallback) because Jooble's matching behavior runs in the opposite direction: shorter is cleaner, longer is noisier. Jooble remains USA-only (`us` fallback), never UK — already true in current code (`executeMarketFallback`: `us -> Jooble`, `gb -> Reed`) and unchanged by this proposal.
- **Live verification (2026-09-17, real Jooble API, `location: "United States"`)**:
  - `keywords: "Head of Finance"` (anchor phrase): 3044 total, clean top-20 — `Head of Finance` variants, `VP of Finance`, `CFO`, all genuinely finance-leadership roles, $160k-$400k.
  - `keywords: "Group Head of Finance"` (full raw title): 11,169 total — more than triple the count, and real noise appears in the same top-20 window: `MiCAL Supervisor (Full-Time)`, `Supervisor, Fabrication HLK`, `Lead Organizer (Supervisor)`, `Lead Gutter Technician - Field Production Supervisor`, `Driver - Lead Support Driver`. The extra generic word ("Group") measurably drags in unrelated trades/logistics postings rather than narrowing anything.
  - Quoted vs. unquoted `keywords` produced byte-identical results (3044/3044, same top results) — confirms Jooble's `keywords` field does not parse quote/phrase syntax, so no Reed-style or Adzuna-style exact-match trick is available.
  - **Control test — no word-presence requirement at all**: appending a nonsense word to the anchor-phrase query (`"Head of Finance Zzznonexistentword"`) returned the *exact same* 3044 total and identical top results as the query without it. Unlike Adzuna's `title_only` (which the equivalent control test drove to 0 — see §3b), Jooble silently ignores unmatched terms rather than requiring them: not AND, not strict OR, closer to loose/fuzzy ranking. This is why *shorter* input helps here — every extra word is a new opportunity to loosely match something irrelevant, with no mechanism to require it actually be present.
  - **Silent-failure finding (test-methodology note, not a production bug)**: querying Jooble with `location: "UK"` (a value this app never sends it, since UK traffic never reaches Jooble) returned completely unrelated jobs (`Banquets Set-Up Lead`, `z/OS Mainframe Systems Programmer Lead`). The existing country-alias normalization in `jobs.ts`/`salary.ts` already prevents an unrecognized location string from reaching any provider, so this isn't reachable today — but a future regression routing UK traffic to Jooble would fail silently (irrelevant results) rather than loudly, which is why §5.2's task list adds an explicit regression guard.
- **Alternatives Considered**: Full raw title as Jooble's query, matching Reed/Adzuna's Tier 1 pattern for consistency (rejected: live-verified to be strictly worse — more results, more noise, no compensating benefit, since Jooble has no phrase/title-only/AND mechanism to make the extra words earn their keep). No query change at all, keeping the current full-title behavior (rejected: costs nothing to switch to the anchor phrase, and the live data shows it strictly reduces noise).

### 4. Statistical Outlier Salary Trimming & Spread Reduction
- **Choice**:
  - **Sanity Bounds**: Filter out full-time annual salaries < £15,000 / $25,000 (often misclassified hourly/daily rates) or > £1,000,000.
  - **IQR Trimming**: When calculating statistics from raw salary samples (if sample size >= 5):
    - Compute $Q_1$ (25th percentile) and $Q_3$ (75th percentile), $IQR = Q_3 - Q_1$.
    - Exclude salaries outside $[Q_1 - 1.5 \times IQR, Q_3 + 1.5 \times IQR]$.
    - Calculate `mean` and `buildHistogramBuckets` from the trimmed sample.
- **Alternatives Considered**: Hardcoded salary caps per role (rejected: impossible to maintain across thousands of distinct job titles; IQR dynamically adapts to each role).

### 5. Provider Caching Policy
- **Choice**:
  - When the regional primary provider fulfills the request (Reed for UK, Adzuna for USA), set `expiresAt` to `now + cacheDays` (default 30 days, or category TTL).
  - When the regional fallback provider fulfills the request (Adzuna for UK, Jooble for USA), set `expiresAt` to `now + 24 hours`.
- **Verified precondition**: `jobs.ts:294` and `salary.ts:241` currently compute this via `const isFallbackProvider = !!cleanData.provider && cleanData.provider !== 'adzuna'`. That's only correct while Adzuna is unconditionally primary. Once Reed becomes UK primary, a successful Reed response still satisfies `provider !== 'adzuna'` and would be wrongly capped at the 24-hour fallback TTL. Both call sites must change this predicate to be region-aware: `countryCode === 'gb' ? cleanData.provider !== 'reed' : cleanData.provider !== 'adzuna'`.

## Risks / Trade-offs

- **[Risk: Strict filtering leaves zero jobs for niche or obscure job titles]**
  → *Mitigation*: Tiered search progression: Tier 1 (Reed exact quote on the extracted anchor phrase + filter) → Tier 2 (Reed broad keyword on the full title + filter) → Tier 3 (Adzuna fallback). If all providers return zero jobs, the endpoint returns a clean 404/empty response so frontend gracefully handles fallback to government macro baselines.

- **[Risk: Reed API quota or rate limiting in UK]**
  → *Mitigation*: Any Reed HTTP error (429, 403, 500) or 0-result response immediately triggers fallback to Adzuna without crashing the request.

- **[Risk: Part-time jobs filtered out by full-time salary floor]**
  → *Mitigation*: The sanity salary floor scales based on `jobType` (e.g. £15,000 for full-time, £7,500 for part-time).
