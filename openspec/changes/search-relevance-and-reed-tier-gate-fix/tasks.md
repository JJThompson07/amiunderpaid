# Tasks

## 1. Pre-Flight Verification & Scope Confirmation

- [ ] 1.1 Execute manual pre-flight check against live Reed API for `"lead software engineer"` to confirm quoted Tier 1 returns sparse results (~24 total, ~18 salaried) while unquoted Tier 2 returns a rich candidate pool (~548 results), and verify Reed rate limits (1,000 req/day).
- [ ] 1.2 Re-verify `server/utils/adzuna.ts` against live Adzuna API, confirming both Tier 1 and Tier 2 use `title_only` (keyword title matching) and Tier 2 only relaxes scope modifiers via `extractSearchAnchorPhrase`, confirming Adzuna does not exhibit the quoted vs unquoted 20x gap. A preliminary live check during proposal review (2026-09-18) already found 451 raw matches for `title_only=lead software engineer` — re-run fresh at implementation time since live listings drift; do not simply copy this figure forward unchecked.
- [ ] 1.3 Verify `server/utils/jooble.ts`, confirming it operates as a single-call US fallback querying with `extractSearchAnchorPhrase` and intentionally skips `filterAndRankJobsByRelevance` to preserve fallback listing availability.
- [ ] 1.4 Audit proposed `SENIORITY_TIERS.mid_core` role-nouns across Healthcare, Education, Legal, Operations, and Trades to ensure full coverage and confirm zero keyword collisions with `SCOPE_MODIFIERS`.
- [ ] 1.5 Read `server/api/market-data/jobs.ts`'s `defineCachedFunction` `getKey` and its `db.collection('adzuna_jobs_cache').doc(cacheKey)` write to determine the exact cache key shape (title/location/country/category, and specifically whether `jobType`/`contractType` are part of the key), and compare it against `server/api/market-data/salary.ts`'s `adzuna_distribution_cache` key scheme. Confirm or refute key parity before designing task 5.2 — do not assume they match; `salary.ts` currently contains a hardcoded `` `${cacheKey}-full-time-permanent-10` `` suffix guessing at `jobs.ts`'s key for the default filter combination only, which is evidence they may not already be consistent. Also confirm the two caches' current Firestore TTLs.

## 2. Search Relevance Engine & Domain-Token Filtering

- [ ] 2.1 Expand `SENIORITY_TIERS.mid_core` in `server/utils/searchRelevance.ts` with cross-vertical role nouns across Healthcare (`nurse`, `doctor`, `physician`, `therapist`, `clinician`, `practitioner`, `pharmacist`, `paramedic`, `optometrist`), Education (`teacher`, `lecturer`, `tutor`, `instructor`, `educator`, `professor`, `academic`), Legal (`lawyer`, `solicitor`, `barrister`, `paralegal`, `counsel`, `attorney`), Operations/Business (`recruiter`, `coordinator`, `administrator`, `advisor`, `representative`, `agent`, `buyer`, `planner`, `estimator`, `underwriter`, `clerk`, `scientist`, `researcher`, `technician`, `mechanic`, `architect`, `surveyor`, `economist`, `statistician`), and Trades (`electrician`, `plumber`, `carpenter`, `builder`, `machinist`, `fitter`, `welder`, `operator`, `operative`).
- [ ] 2.2 Implement the **three-way** token partitioning (see design.md Decision 1's Reviewer Correction — not the original two-way generic/domain split) in `calculateTitleRelevanceScore` and `filterAndRankJobsByRelevance` in `server/utils/searchRelevance.ts`:
  - Scope-modifier tokens (`SCOPE_MODIFIERS`): optional, never required, excluded from any overlap count.
  - Hierarchy-level tokens (`executive`/`head_director`/`manager_lead`/`junior_entry` tiers only — **excluding** `mid_core`): governed exclusively by the existing `isSeniorityCompatible` tier-rank comparison, not literal-token overlap.
  - Domain-specific tokens (redefined as `mid_core` role-nouns **plus** the existing elimination bucket): 100% mandatory literal-or-`DOMAIN_STEMS` match; missing any one results in immediate rejection regardless of query length.
  - Explicitly resolve the `engineer`/`developer` near-synonym case (recommendation in design.md: leave `DOMAIN_STEMS` untouched, treat as distinct/non-interchangeable) and document the choice in code comments if the decision is non-obvious from the diff.
- [ ] 2.3 Author unit tests in `server/utils/tests/searchRelevance.spec.ts` asserting:
  - Rejection of 3+-word listings missing domain tokens (e.g. `"Lead Mechanical Engineer"`, `"Lead Electrical Engineer"`, `"RF Lead Engineer"` on a `"Lead Software Engineer"` search).
  - Acceptance of listings that vary only a **hierarchy-level** or **scope-modifier** token while all domain tokens (including `mid_core` role-nouns) match: `"Financial Analyst"` accepted for a `"Senior Financial Analyst"` search (scope modifier `senior` optional); `"Director of Operations"` accepted for a `"Head of Operations"` search (`head`↔`director` same tier, rank-compatible, not literal-matched).
  - Rejection of listings that vary a `mid_core` role-noun even when hierarchy/scope tokens match and tier rank is nominally compatible: `"Senior Nurse"` rejected for a `"Senior Engineer"` search (both resolve to `mid_core` rank but are different professions — this is the regression case the three-way split closes that a naive two-way split reintroduces).
  - `"Lead Software Developer"` and `"Lead Software & Cloud Engineer"` against a `"Lead Software Engineer"` search: assert the outcome decided in task 2.2 (rejection if `engineer`/`developer` are kept distinct, per the design recommendation — do not assume acceptance without task 2.2's explicit decision being reflected here).
  - Multi-vertical domain matching (e.g. `"Lead Veterinary Nurse"` rejecting `"Lead Dental Nurse"`).
  - Strict disjointness regression guard between `SCOPE_MODIFIERS` and `ALL_SENIORITY_WORDS`.
  - Verify unit test suite passes with `pnpm test -- server/utils/tests/searchRelevance.spec.ts`.

## 3. Reed Tier Gate & Sample Sufficiency Refinement

- [ ] 3.1 Update `MIN_TIER1_SALARIED_RESULTS = 15` in `server/utils/reed.ts` and refine `fetchReedData` to execute Tier 2 unquoted search when Tier 1 salaried count is below 15, applying `filterAndRankJobsByRelevance` and IQR outlier trimming post-fetch.
- [ ] 3.2 Update and expand unit tests in `server/utils/tests/reed.spec.ts` asserting:
  - Single-call execution when Tier 1 returns $\ge 15$ salaried results.
  - Two-tier fallback execution when Tier 1 returns $< 15$ salaried results.
  - Strict post-fetch relevance filtering on Tier 2 unquoted results.
  - Verify unit test suite passes with `pnpm test -- server/utils/tests/reed.spec.ts`.

## 4. Verification & Gate Checks

- [ ] 4.1 Run unit test coverage gate `pnpm test:coverage` and verify `server/utils/searchRelevance.ts` and `server/utils/reed.ts` achieve $\ge 80\%$ on all four metrics (statements, branches, functions, and lines).
- [ ] 4.2 Run repository verification suite `pnpm test:verify` (chaining `pnpm lint`, `pnpm test:coverage`, `pnpm test:e2e`, and `pnpm test:rules`) and ensure zero errors or regressions.

## 5. Redundant Reed/Jooble Histogram Call Elimination

- [ ] 5.1 Using task 1.5's confirmed `adzuna_jobs_cache` key shape and TTL, design the exact reuse mechanism for `server/api/market-data/salary.ts`: how it reads a fresh `jobs.ts`-populated cache entry for the resolved provider (Reed/Jooble), extracts the entry's already-computed `histogram` field, and what constitutes a "fresh" entry (align with `jobs.ts`'s own TTL/staleness semantics — including its "stale UK provider" invalidation check — rather than inventing a separate freshness rule).
- [ ] 5.2 Modify `server/api/market-data/salary.ts`'s `fetchRegionalPrimary`/`fetchByProviderName` so that when the resolved provider is Reed (UK) or Jooble (USA fallback), the histogram is sourced from the reused `jobs.ts` cache entry designed in 5.1 instead of independently calling `fetchReedData`/`fetchJoobleData`. On a cache miss, fall through to a live fetch using the real `jobType`/`contractType` values (not the current empty strings), fixing the parameter-mismatch bug as part of consolidating the two call sites. Leave Adzuna's `fetchAdzunaHistogram` call path entirely unchanged.
- [ ] 5.3 Update `server/api/market-data/tests/salary.spec.ts` asserting:
  - Reed/Jooble histogram reuse from a fresh jobs-cache entry (assert `fetchReedData`/`fetchJoobleData` mocks are NOT called when a fresh entry exists).
  - Correct fallback to a live fetch on a jobs-cache miss, using real (not empty) `jobType`/`contractType` filters.
  - Adzuna's path is unchanged (`fetchAdzunaHistogram` still called directly, unaffected by the Reed/Jooble reuse logic).
  - Verify unit test suite passes with `pnpm test -- server/api/market-data/tests/salary.spec.ts`.
- [ ] 5.4 Update `server/api/market-data/tests/jobs.spec.ts` if the cache-write shape in `jobs.ts` needs any adjustment to support 5.1/5.2's reuse (e.g. ensuring the `histogram` field is always present on write); otherwise confirm no changes are needed and note why in the PR description.
- [ ] 5.5 Update the `reed-api-fallback` and `jooble-api-fallback` delta specs' "Server-Side Statistical Calculation" requirements to document histogram derivation from already-fetched job listings instead of a redundant second provider call.
