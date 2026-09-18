# Design: Search Relevance Domain-Token Enforcement & Reed Tier Gate Refinement

## Context

Am I Underpaid routes UK salary benchmark requests to the Reed.co.uk API (`server/utils/reed.ts`) as primary, falling back to Adzuna. USA requests route to Adzuna (`server/utils/adzuna.ts`) as primary, falling back to Jooble (`server/utils/jooble.ts`).

Candidate job listings returned by upstream APIs are scored and filtered by `filterAndRankJobsByRelevance` in `server/utils/searchRelevance.ts`.

During live Reed API testing and relevance pipeline verification:

1. **Reed Quoted vs Unquoted Discrepancy**: Quoting exact phrases in Reed restricts results to the exact string sequence in job titles. For `"lead software engineer"`, quoted search returned 24 results (18 salaried) while unquoted search returned 548 results. Because the current threshold `MIN_TIER1_SALARIED_RESULTS = 3` was satisfied by 18, Tier 2 never executed, leaving over 95% of available market listings unreached.
2. **Relevance Filter False Positives**: For 3+-word searches, the existing filter allowed listings with $\ge 66\%$ token overlap to pass. Because all tokens were weighted equally, listings matching generic role/seniority tokens (`lead` + `engineer`) but missing the domain token (`software`) scored $2/3 \approx 0.667$ and passed, contaminating software salary benchmarks with mechanical and electrical engineering listings.
3. **Role Noun Gaps in `SENIORITY_TIERS`**: `SENIORITY_TIERS.mid_core` only included IT/finance terms, causing non-IT role nouns (e.g., `nurse`, `teacher`, `solicitor`) to be treated as domain tokens rather than generic role nouns.
4. **Redundant Reed/Jooble Histogram Re-Fetch**: Investigating call volume alongside the above surfaced that `server/api/market-data/salary.ts` independently re-calls `fetchReedData`/`fetchJoobleData` to compute a histogram that `server/api/market-data/jobs.ts` has already derived from the same search results one call earlier — a wasted live provider call on every UK/USA-fallback request, plus a parameter-mismatch bug (`salary.ts` passes empty `jobType`/`contractType` where `jobs.ts` passes the real, user-selected values) that makes the displayed histogram inconsistent with the displayed job listings. Adzuna is unaffected: its second call hits a distinct, dedicated `/histogram` endpoint returning additive data, not a re-derivation of the search call.

## Goals / Non-Goals

**Goals:**

- Implement a pure token classification algorithm in `server/utils/searchRelevance.ts` partitioning search tokens into generic vs. domain-specific.
- Enforce a 100% mandatory match requirement on domain-specific search tokens for all candidate listings, eliminating off-domain false positives on 3+-word queries.
- Apply fractional overlap thresholds strictly to generic tokens when domain tokens match.
- Expand `SENIORITY_TIERS.mid_core` with standard cross-vertical role-nouns across Healthcare, Education, Legal, Science, Operations, and Trades, while guaranteeing disjointness from `SCOPE_MODIFIERS`.
- Redesign Reed's Tier 1 / Tier 2 gating in `server/utils/reed.ts` with a statistically robust salaried sample threshold ($\ge 15$), enabling rich unquoted fallback when exact-phrase sample size is sparse while conserving Reed API quota (1,000 req/day limit).
- Eliminate the redundant second live Reed/Jooble provider call `server/api/market-data/salary.ts` currently makes to compute a histogram that `server/api/market-data/jobs.ts` has already derived from the same search, deriving it from the already-fetched/cached job data instead (see Decision 5), and fix the accompanying jobType/contractType parameter-mismatch bug this uncovered.
- Maintain 100% unit-test coverage across modified utilities, adhering strictly to the $\ge 80\%$ per-file coverage requirement.

**Non-Goals:**

- Creating an explicit dictionary/whitelist of domain words (domain tokens are classified dynamically by elimination).
- Altering Adzuna's query or dual-call (search + histogram) architecture. Adzuna uses `title_only` without quoted phrases and does not exhibit Reed's quoted/unquoted collapse (live-verified: 451 raw matches on a single `title_only=lead software engineer` call — see Decision 4), and its dedicated `/histogram` endpoint aggregates a genuinely broader pool than the capped job-listing endpoint, so its second call is additive, not redundant. **User-confirmed 2026-09-18** as out of scope.
- Altering Jooble's or Reed's _query/filtering_ behavior beyond what Decisions 1–3 already specify (Jooble intentionally skips `filterAndRankJobsByRelevance` to preserve fallback availability — unchanged). Decision 5's histogram-sourcing fix changes _where_ the histogram data comes from, not how either provider is queried or filtered.
- Pointing Playwright or automated test suites at live external APIs (all automated tests must use deterministic mocks per `CODE_STANDARDS.md` §10).
- Altering public API response schemas or frontend client components.

## Decisions

### 1. Domain-Specific vs. Generic Token Partitioning Algorithm

- **Choice**: In `server/utils/searchRelevance.ts`:
  1. Tokenize the search title: $S = \text{tokenize}(\text{searchTitle})$.
  2. Define the generic vocabulary set:
     $$\text{GENERIC\_SET} = \text{new Set}([\dots\text{ALL\_SENIORITY\_WORDS}, \dots\text{SCOPE\_MODIFIERS}])$$
  3. Partition $S$ into:
     - Domain search tokens: $D_S = [t \in S \mid !\text{GENERIC\_SET.has}(t)]$
     - Generic search tokens: $G_S = [t \in S \mid \text{GENERIC\_SET.has}(t)]$
  4. For a candidate job listing title, compute $C = \text{new Set}(\text{tokenize}(\text{candidateTitle}))$.
  5. **Domain Token Match Rule**:
     $$\forall t \in D_S, t \in C$$
     If any token in $D_S$ is absent in $C$, the candidate title is rejected immediately (score = 0).
  6. **Generic Token Overlap Rule**:
     If $|D_S| > 0$ and domain tokens match, or if $|D_S| = 0$:
     - If $|G_S| = 0$: Generic overlap requirement is satisfied (1.0).
     - If $|G_S| \le 2$ or $|S| \le 2$: Candidate MUST match 100% of generic search tokens ($\text{overlap} = 1.0$).
     - If $|G_S| \ge 3$ and $|S| \ge 3$: Candidate MUST match $\ge 66\%$ of generic search tokens ($\text{overlap} \ge 0.66$).
  7. **Seniority Hierarchy Guardrail**:
     Candidate MUST satisfy `isSeniorityCompatible(S, tokenize(candidateTitle))`.
  8. **Relevance Score Calculation**:
     $$\text{calculateTitleRelevanceScore}(candidateTitle, searchTitle) = \begin{cases} 0 & \text{if any } t \in D_S \notin C \\ \frac{|\{t \in S \mid t \in C\}|}{|S|} & \text{if all } D_S \subseteq C \end{cases}$$

- **Worked Examples**:
  - _Search_: `"Lead Software Engineer"` $\to D_S = [\text{"software"}], G_S = [\text{"lead"}, \text{"engineer"}]$.
    - Candidate `"Lead Mechanical Engineer"`: $C = \{\text{lead}, \text{mechanical}, \text{engineer}\}$. Missing `"software"` $\to$ Score = 0 $\to$ **REJECTED**.
    - Candidate `"Lead Electrical Engineer"`: Missing `"software"` $\to$ Score = 0 $\to$ **REJECTED**.
    - Candidate `"Lead Software Developer"`: Contains `"software"` ($1/1 = 100\%$), contains `"lead"` ($1/2$ generic, rank-compatible) $\to$ **ACCEPTED**.
  - _Search_: `"Senior Financial Analyst"` $\to D_S = [\text{"finance"}], G_S = [\text{"senior"}, \text{"analyst"}]$ (via `DOMAIN_STEMS`).
    - Candidate `"Senior IT Analyst"`: Missing `"finance"` $\to$ Score = 0 $\to$ **REJECTED**.
    - Candidate `"Financial Analyst"`: Contains `"finance"`, contains `"analyst"` $\to$ **ACCEPTED**.
  - _Search_: `"Head of Operations"` $\to D_S = [\text{"operations"}], G_S = [\text{"head"}]$.
    - Candidate `"Head of Marketing"`: Missing `"operations"` $\to$ **REJECTED**.
    - Candidate `"Director of Operations"`: Contains `"operations"`, compatible seniority $\to$ **ACCEPTED**.

- **Alternatives Considered**:
  - _Explicit domain term whitelist_: Rejected as unbounded, brittle, and impossible to maintain across all industries and specializations.
  - _Fuzzy string similarity (Levenshtein/Jaro-Winkler)_: Rejected because token semantics (domain vs seniority) are lost in character-level edit distance.

- **⚠️ Reviewer Correction (Claude, implementation review, 2026-09-18): the algorithm above is internally inconsistent with its own worked examples and must be revised before implementation.**

  Re-running the formal rule in step 6 against each "ACCEPTED" worked example above shows all three fail the rule as literally written:
  - `"Financial Analyst"` vs. search `"Senior Financial Analyst"`: $G_S = [\text{senior}, \text{analyst}]$, $|G_S| = 2 \le 2 \Rightarrow$ 100% literal generic-token overlap required. Candidate contains `"analyst"` but not `"senior"` $\Rightarrow$ overlap $= 1/2 = 50\% \ne 100\%$. Per step 6, this is a **REJECT**, not the documented ACCEPT.
  - `"Director of Operations"` vs. search `"Head of Operations"`: $G_S = [\text{head}]$, $|G_S| = 1 \le 2 \Rightarrow$ 100% literal match of `"head"` required. Candidate contains `"director"`, not the literal token `"head"` $\Rightarrow$ overlap $= 0/1 = 0\%$. Per step 6, this is a **REJECT**. The worked example's justification ("compatible seniority") silently substitutes the step-7 tier-rank check for the step-6 literal-overlap check — the two are not equivalent, and step 6 as written does not defer to step 7.
  - `"Lead Software Developer"` vs. search `"Lead Software Engineer"`: $G_S = [\text{lead}, \text{engineer}]$, $|G_S| = 2 \le 2 \Rightarrow$ 100% literal match required. Candidate contains `"lead"` but not `"engineer"` (`"developer"` is a different literal token, and `DOMAIN_STEMS` has no `developer ↔ engineer` mapping) $\Rightarrow$ overlap $= 1/2 = 50\%$. Per step 6, this is a **REJECT**.

  **Root cause**: `GENERIC_SET` (step 2) unions `ALL_SENIORITY_WORDS` — all five `SENIORITY_TIERS`, including `mid_core` — with `SCOPE_MODIFIERS`, then applies one literal-token-overlap treatment to the whole union. But these are three semantically different word classes, and only two of them behave the way step 6 assumes:
  - `SCOPE_MODIFIERS` (e.g. `senior`, `group`, `global`) are genuinely optional — `extractSearchAnchorPhrase` already strips exactly this class of word because it's non-essential to the role.
  - The four hierarchy-_level_ tiers (`executive`, `head_director`, `manager_lead`, `junior_entry`, e.g. `head`/`director`/`partner`/`principal` all in `head_director`) genuinely are near-synonyms _within a tier_ — that's the entire premise `isSeniorityCompatible` (step 7) already relies on, comparing tier **rank**, not literal word identity. `"director"` correctly satisfies `"head"` here, but only via the rank-compatibility mechanism, not literal overlap.
  - `mid_core` is different in kind: it enumerates **profession/role nouns** (`engineer`, `nurse`, `analyst`, `developer`, `solicitor`, …), and words within it are emphatically **not** interchangeable with each other — an `engineer` is not a `nurse` just because both happen to resolve to the same rank number. Treating `mid_core` as tier-rank-comparable the same way as the other four tiers reintroduces exactly the false-positive class this proposal exists to close: a bare search like `"Senior Engineer"` (`$D_S = []$` once `engineer` is classified generic) would, under the literal algorithm's own step-7 fallback, let a `"Senior Nurse"` listing pass `isSeniorityCompatible` (`engineer` and `nurse` are both `mid_core` rank 1) purely because neither the domain check (empty) nor the generic check requires the literal role noun to match.

  **Required fix**: split the classification into three, not two, buckets:
  1. `SCOPE_MODIFIERS` — optional; excluded entirely from any required-overlap count (never blocks acceptance on its own).
  2. Hierarchy-level tiers only — `executive ∪ head_director ∪ manager_lead ∪ junior_entry` (excluding `mid_core`) — governed exclusively by `isSeniorityCompatible`'s existing tier-rank comparison; literal identity is not required (`"head"` and `"director"` are interchangeable because they share a tier).
  3. **Domain-specific tokens** — redefined as `mid_core` role-nouns **plus** every token not in any `SENIORITY_TIERS` tier or `SCOPE_MODIFIERS` (the existing elimination bucket). Both subsets require the existing 100%-literal-or-`DOMAIN_STEMS`-match rule from step 5. This folds `mid_core` into the "must actually match" bucket instead of the "generic, rank-only" bucket.

  This resolves the `"Senior Financial Analyst"`/`"Financial Analyst"` and `"Head of Operations"`/`"Director of Operations"` examples cleanly (`senior` drops out as optional; `head`↔`director` resolves via tier rank, not literal match) and closes the `"Senior Nurse"` false-positive gap. It leaves exactly one open case requiring an explicit decision, since `mid_core` no longer gets a rank-only pass:

  - `"Lead Software Developer"` vs. search `"Lead Software Engineer"` — `engineer` (now a required domain token, since it's `mid_core`) is absent from the candidate; `developer` is a different literal token with no existing `DOMAIN_STEMS` entry linking it to `engineer`. Two ways to resolve, both defensible — task 2.2/2.3 must pick one explicitly rather than leave the ambiguity in code:
    - (a) Add `developer: 'engineer'` (or the reverse) to `DOMAIN_STEMS`, using the exact mechanism already used for `financial ↔ finance`/`accounting ↔ accountant`, so the two are treated as one canonical role for matching purposes.
    - (b) Leave `DOMAIN_STEMS` untouched and correct the worked example to **REJECTED** — a Developer and an Engineer are related but distinct titles, and the whole thrust of this proposal is tightening precision against exactly this class of near-miss.
    - **Recommendation**: (b). `DOMAIN_STEMS` today only encodes pure morphological variants of the _same_ word (noun/adjective/gerund forms), not cross-word professional synonymy; stretching it to `developer ↔ engineer` opens the door to subjective synonym judgment calls (is `consultant ↔ advisor`? `coordinator ↔ administrator`?) that are hard to bound and easy to get wrong, which is the same "unbounded whitelist" failure mode already rejected as an alternative above. Reject-by-default is also the safer failure direction for a salary benchmark: an over-strict filter under-samples market data (a data-completeness cost), while an over-loose one silently contaminates every benchmark it touches (a data-_correctness_ cost) — see the parallel argument in the new Decision 5 risk below re: the histogram consistency fix.

  Task 2.2 and 2.3 (and the `search-relevance-and-specificity` delta spec's scenarios) must implement and test this three-way split, not the two-way split originally drafted above, and must add explicit regression cases for all three corrected worked examples plus the `"Senior Nurse"`/`"Senior Engineer"` false-positive this correction closes.

### 2. Multi-Vertical Role-Noun Vocabulary Expansion

- **Choice**: Broaden `SENIORITY_TIERS.mid_core` in `server/utils/searchRelevance.ts` with common cross-vertical role-nouns:
  - **Existing IT/Finance/Design**: `accountant`, `engineer`, `analyst`, `consultant`, `specialist`, `developer`, `designer`, `officer`, `auditor`, `executive`
  - **Healthcare / Medical**: `nurse`, `doctor`, `physician`, `therapist`, `clinician`, `practitioner`, `pharmacist`, `paramedic`, `optometrist`
  - **Education / Academia**: `teacher`, `lecturer`, `tutor`, `instructor`, `educator`, `professor`, `academic`
  - **Legal / Compliance**: `lawyer`, `solicitor`, `barrister`, `paralegal`, `counsel`, `attorney`
  - **Operations / Business / Admin**: `recruiter`, `coordinator`, `administrator`, `advisor`, `representative`, `agent`, `buyer`, `planner`, `estimator`, `underwriter`, `clerk`, `scientist`, `researcher`, `technician`, `mechanic`, `architect`, `surveyor`, `economist`, `statistician`
  - **Construction / Trades / Industry**: `electrician`, `plumber`, `carpenter`, `builder`, `machinist`, `fitter`, `welder`, `operator`, `operative`

- **Disjointness Guardrail**:
  The existing unit test in `server/utils/tests/searchRelevance.spec.ts` (`it('never lets SCOPE_MODIFIERS overlap with seniority-tier vocabulary')`) is maintained and enforced to guarantee that `SCOPE_MODIFIERS` and `ALL_SENIORITY_WORDS` remain strictly disjoint.

- **Alternatives Considered**:
  - _Leaving `mid_core` limited to IT/finance_: Rejected because searches like `"Senior Staff Nurse"` or `"Lead Dental Nurse"` would classify `nurse` as a domain token, breaking generic overlap logic.

### 3. Reed Sample Sufficiency & Tier Gate Redesign

- **Choice**: In `server/utils/reed.ts`:
  1. Increase `MIN_TIER1_SALARIED_RESULTS` from `3` to `15`.
  2. Execute Tier 1 exact-phrase search (full title quoted, OR'd with anchor phrase if shortened).
  3. Relevance-filter Tier 1 jobs using `filterAndRankJobsByRelevance` and count salaried results (`tier1SalariedCount`).
  4. If `tier1SalariedCount >= 15`:
     - Tier 1 has returned a statistically sufficient sample for IQR outlier trimming (quartile estimation) and 7-bucket histogram generation.
     - Return `tier1Result` immediately, saving upstream API calls against Reed's 1,000 req/day quota.
  5. If `tier1SalariedCount < 15`:
     - Execute Tier 2 unquoted search with `keywords: buildTier2Keywords(title, categoryKeyword)` and `resultsToTake: 100`.
     - Relevance-filter Tier 2 results with `filterAndRankJobsByRelevance(mappedJobs, title)`.
     - Compute statistics from the relevance-filtered Tier 2 dataset (or merge with Tier 1 deduplicated by `id`).
     - Return the processed Tier 2 response.

- **Rate Limit & Sample Size Trade-Off Analysis**:
  - Reed rate limit: 1,000 requests/day.
  - With Firestore 30-day caching and Nitro 1-hour in-memory cache, identical searches never hit the live API.
  - Setting the threshold to 15 ensures that popular searches with ample exact-phrase listings (e.g., standard titles with $\ge 15$ exact matches) execute exactly 1 API call, while sparse or multi-word searches (e.g., `"lead software engineer"` with only 18 exact vs 548 unquoted, or niche titles with 1-10 exact matches) execute Tier 2 to access the wider pool.

- **Alternatives Considered**:
  - _Unconditional unquoted search (single call)_: Rejected because for broad searches, exact-phrase matching provides higher title fidelity, whereas unquoted keyword search can include listings where words only appear in job description text.
  - _Retaining threshold at 3_: Rejected because 3 data points is inadequate for IQR quartile calculation and leaves $>90\%$ of market listings unreachable.

### 4. Multi-Provider Scope & Architectural Verification

- **Adzuna (`server/utils/adzuna.ts`)**:
  - Live query verification confirmed Adzuna uses `title_only` in both Tier 1 (full title) and Tier 2 (anchor phrase).
  - Adzuna's API performs word-level matching within the title field rather than exact quoted sequence matching.
  - Adzuna Tier 2 only relaxes scope modifiers (e.g. `"Group Head of Finance"` $\to$ `"Head of Finance"`) and short-circuits when `anchorPhrase === title` — this is why, for `"Lead Software Engineer"` specifically, Adzuna's Tier 2 never fires at all: `"lead"` is itself the seniority anchor with no leading scope modifier to strip, so `extractSearchAnchorPhrase` returns the title unchanged.
  - **Reviewer live re-verification (Claude, 2026-09-18)**: task 1.2 was still unchecked while this document asserted its conclusion as settled fact — a Verify-Don't-Guess gap. Re-ran the live check this session: `title_only=lead software engineer` against Adzuna's UK search endpoint alone (i.e. Tier 1, since Tier 2 never fires for this query) returns 451 raw matches, in the same order of magnitude as Reed's _unquoted_ Tier 2 pool (548) and nothing like Reed's 24-result quoted collapse. This confirms the design's conclusion, with a real number now backing it instead of an unverified assertion. **Task 1.2 should still be re-run at implementation time** (live data drifts) — treat this figure as corroborating evidence, not a substitute for the task.
  - Adzuna does not suffer from Reed's 20x quoted-to-unquoted discrepancy; no changes to Adzuna query structure are required.
- **Jooble (`server/utils/jooble.ts`)**:
  - Jooble acts as the US secondary fallback when Adzuna fails or returns 429.
  - Jooble queries with `extractSearchAnchorPhrase` directly and intentionally skips `filterAndRankJobsByRelevance` to maintain fallback listing availability. No changes required to its query or filtering behavior — see Decision 5 below for an unrelated fix to how its _histogram_ is sourced.

### 5. Eliminate Redundant Reed/Jooble Histogram Provider Calls

- **Context**: `server/api/market-data/jobs.ts` (job listings) and `server/api/market-data/salary.ts` (histogram) are two independent Nitro routes, each independently resolving and calling the regional provider. `useLocationEngine.ts` fires both (`Promise.all([adzuna.fetchJobs(...), adzuna.fetchHistogram(...)])`) on every load. For UK/USA-fallback traffic this is genuinely wasteful:
  - `processReedData` (`server/utils/reed.ts`) and Jooble's equivalent processing step both already compute `histogram: buildHistogramBuckets(trimmedSalaries, 7)` directly from the same job-search results `jobs.ts` fetches. `salary.ts`'s `fetchRegionalPrimary` (UK branch) independently calls `fetchReedData(...)` a second time purely to get back a histogram it could already derive from `jobs.ts`'s result. The USA-fallback-to-Jooble path has the same redundancy for `fetchJoobleData`.
  - **This is Reed/Jooble-only.** Adzuna is architecturally different and explicitly out of scope: it has a dedicated `/histogram` endpoint (`fetchAdzunaHistogram`) that aggregates a broader server-side pool than the capped `/search/1` job-listing endpoint, so Adzuna's second call returns genuinely different, additive data rather than a redundant re-derivation of the first. **User-confirmed 2026-09-18**: Adzuna's two-call structure (search + histogram) is correct and must not be touched.
  - **Compounding correctness bug found alongside the redundancy**: `salary.ts`'s Reed call passes empty-string `jobType`/`contractType` (`fetchReedData(titleStr, locationStr, '', '', categoryStr)`), while `jobs.ts`'s call for the same request uses the real, user-selected values. This means the histogram is currently computed from an _unfiltered_ Reed sample, inconsistent with the filtered job listings actually displayed alongside it — not just wasted quota, but a data-consistency bug.

- **Choice**: For Reed (UK) and Jooble (USA fallback) only, `salary.ts` SHALL derive the histogram from the job-search response `jobs.ts` already fetched and cached, rather than independently re-calling `fetchReedData`/`fetchJoobleData`. Concretely:
  1. On a request, `salary.ts` first checks for a fresh entry in the same cache `jobs.ts` populates (`adzuna_jobs_cache` Firestore collection, keyed consistently with `jobs.ts`'s `generateCacheKey`-based scheme — see pre-flight task below) for the resolved provider being Reed/Jooble.
  2. If a fresh entry exists, reuse its already-computed `histogram` field directly — no live provider call.
  3. On a cache miss, fall through to a live fetch using the exact same parameters `jobs.ts` would use (real `jobType`/`contractType`, not empty strings), fixing the parameter-mismatch bug as an intended side effect of consolidating the two call sites onto one code path rather than a silent, separate fix.
  4. Adzuna's path is untouched: `salary.ts` continues calling `fetchAdzunaHistogram` directly for USA-primary traffic.

- **Required pre-flight verification** (this must be resolved before finalizing the reuse mechanism, not assumed): confirm the exact cache key shape `jobs.ts` uses for `adzuna_jobs_cache` (`server/api/market-data/jobs.ts` — the `defineCachedFunction`'s `getKey`, and the `db.collection('adzuna_jobs_cache').doc(cacheKey)` write), specifically whether it varies by `jobType`/`contractType`, and whether it matches or diverges from the key scheme `salary.ts`'s own `adzuna_distribution_cache` currently uses. This session found a concrete signal that the two are **not** already key-consistent: `salary.ts` contains a hardcoded `` `${cacheKey}-full-time-permanent-10` `` suffix used to opportunistically read `jobs.ts`'s category-tag cache — a hardcoded guess at `jobs.ts`'s key shape for the _default_ filter combination only, not a general-purpose shared key scheme. Do not assume key parity; verify it directly against the current `getKey`/cache-write code in `jobs.ts` before implementing the reuse.

- **Alternatives Considered**:
  - _Always fetch via `jobs.ts`'s logic first and derive the histogram universally, removing `salary.ts`'s independent Reed/Jooble fetching path entirely_ (keeping Adzuna's dedicated histogram call): cleanest long-term shape, but requires guaranteeing the client-side call sequencing/caching makes `jobs.ts`'s data available before or alongside the histogram request — larger client/composable-layer change. Not required to close the redundancy for this change; worth a follow-up if the cache-based reuse above proves insufficient.
  - _Merge `jobs.ts` and `salary.ts` into a single Nitro route returning both job listings and histogram_: most architecturally correct, but a materially bigger refactor touching `useLocationEngine.ts`'s fetch/composable layer and both endpoints' response contracts. Explicitly deferred — out of scope for this change.

- **Risk**: `adzuna_jobs_cache` and `adzuna_distribution_cache` may have different TTLs (verify as part of the pre-flight task above). If the jobs cache expires or is absent when a histogram request lands, the fallback in step 3 above reproduces today's live-fetch behavior exactly (not a regression) — it just also fixes the parameter-mismatch bug on that path too, since the fallback uses real filters.

## Risks / Trade-offs

- **[Risk: Strict domain matching rejects valid listings with compound or hyphenated domain words]**  
  → _Mitigation_: `tokenize()` splits on punctuation (except `#` and `+`) and normalizes case. `DOMAIN_STEMS` handles known morphological variations (`financial` $\leftrightarrow$ `finance`, `accounting` $\leftrightarrow$ `accountant`, `development` $\leftrightarrow$ `developer`). Additional common stems can be registered in `DOMAIN_STEMS` as needed.
- **[Risk: Reed Tier 2 unquoted search returns noisy description matches]**  
  → _Mitigation_: The upgraded `filterAndRankJobsByRelevance` strictly filters Tier 2 listings post-fetch, requiring 100% domain token presence in the job title and seniority rank compatibility before listings are included in statistics.
- **[Risk: Upstream Reed rate limit exhaustion during burst traffic]**  
  → _Mitigation_: If Reed returns HTTP 429, 403, or 500, `server/api/market-data/jobs.ts` and `salary.ts` catch the provider failure and seamlessly execute `executeMarketFallback`, routing UK traffic to Adzuna without service disruption.
- **[Risk: `salary.ts`'s histogram-reuse cache-key assumption is wrong, silently serving a stale or mismatched histogram]**  
  → _Mitigation_: The pre-flight task in Decision 5 requires confirming `jobs.ts`'s actual `adzuna_jobs_cache` key shape (including `jobType`/`contractType` sensitivity) before implementation, not assuming it. A cache miss or key mismatch falls through to a correct live fetch (step 3 of Decision 5), so the failure mode is "wasted call, not incorrect data" — never a silently wrong histogram.
