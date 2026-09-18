# Proposal: Search Relevance Domain-Token Enforcement & Reed Tier Gate Refinement

## Why

Live testing against the Reed.co.uk API and verification of the server-side search relevance pipeline identified two interrelated search-quality failure modes affecting UK market data benchmarks:

1. **Reed Tier 1 Exact-Phrase Gate Under-Sampling (Root Cause 1)**: `server/utils/reed.ts` queries Reed with quoted exact phrases in Tier 1 and only falls back to an unquoted Tier 2 search when Tier 1 returns fewer than `MIN_TIER1_SALARIED_RESULTS = 3` salaried results. For multi-word queries like `"lead software engineer"`, Tier 1 returns 24 total results (18 with salaries), clearing the floor of 3 and halting the search — even though an unquoted search reaches 548 results in Reed (over 20x larger pool). A static count floor of 3 cannot distinguish a comprehensive market sample from a 4% sliver of available listings. This behavior is currently codified in `openspec/specs/reed-api-fallback/spec.md` and requires a spec update alongside code changes.
2. **Relevance Filter Domain-Token Blind Spot for 3+-Word Queries (Root Cause 2)**: `server/utils/searchRelevance.ts` (`calculateTitleRelevanceScore` / `filterAndRankJobsByRelevance`) applies a fractional token overlap threshold of 66% for queries with $\ge 3$ tokens, treating all tokens with equal weight. Against 100 real unquoted Reed results for `"Lead Software Engineer"`, 47 passed the filter — including divergent listings like `"Lead Mechanical Engineer"`, `"Lead Electrical Engineer"`, `"Lead Electrical Design Engineer"`, and `"RF Lead Engineer"` (all scoring exactly $2/3 \approx 0.667$). These listings matched generic role/seniority tokens (`lead` + `engineer`) while dropping the core domain token (`software`). This contradicts the standing requirement in `openspec/specs/search-relevance-and-specificity/spec.md` to reject listings lacking primary role domain tokens.
3. **Incomplete Role-Noun Vocabulary**: `SENIORITY_TIERS.mid_core` in `searchRelevance.ts` currently enumerates IT and finance roles (`accountant`, `engineer`, `analyst`, `consultant`, `specialist`, `developer`, `designer`, `officer`, `auditor`, `executive`), omitting standard role-nouns in Healthcare (`nurse`, `doctor`, `pharmacist`), Education (`teacher`, `lecturer`), Legal (`solicitor`, `lawyer`, `paralegal`), and Operations/Trades (`coordinator`, `technician`, `electrician`, `plumber`). Without broadening, these non-IT role-nouns are misclassified as domain-specific tokens.
4. **Redundant Reed/Jooble Histogram Provider Call (Root Cause 4)**: Separately from the search-quality issues above, `server/api/market-data/salary.ts` independently re-calls `fetchReedData`/`fetchJoobleData` to compute a histogram, even though `server/api/market-data/jobs.ts`'s job-listing call has already derived one (`buildHistogramBuckets`) from the same search results one request earlier. This wastes one live provider call per UK/USA-fallback request and, more importantly, carries a parameter-mismatch bug: `salary.ts` passes empty-string `jobType`/`contractType` to Reed where `jobs.ts` passes the real, user-selected filters, so the displayed histogram is silently computed from a different (unfiltered) sample than the displayed job listings. Adzuna is architecturally different and unaffected — its second call hits a dedicated `/histogram` endpoint that aggregates a broader pool than the capped job-search endpoint, so it is additive, not redundant, and is explicitly out of scope for this fix (user-confirmed 2026-09-18).

### Justification for a Single Unified Change

While Root Cause 2 (pure algorithmic relevance scoring) and Root Cause 1 (Reed query tiering) can be described separately, **Root Cause 2 is a strict operational prerequisite for Root Cause 1**:

- Loosening or redesigning Reed's Tier 1 gate increases exposure to unquoted Reed listings (e.g., from 24 to 548 for `"lead software engineer"`).
- If Reed Tier 2 unquoted listings are fetched without the domain-token enforcement fix, the flawed 66% overlap filter will flood UK salary benchmarks with off-domain listings (e.g., mechanical/electrical engineers in software salary aggregates).
- Shipping both fixes together in a single change guarantees that expanding the Reed search sample immediately benefits from strict domain-specific precision.

Root Cause 4 (the redundant histogram call) has no interaction with Root Causes 1–2 — it's bundled here because it surfaced during the same investigation (see `design.md` Context), touches the same `server/utils/reed.ts` code path this change already modifies for Root Cause 1, and is low-risk/independently testable, not because it's a prerequisite of the other fixes.

## What Changes

- **Domain-Token Classification & 100% Match Rule (`server/utils/searchRelevance.ts`)** — see `design.md` Decision 1 and its Reviewer Correction for the full, evidence-backed algorithm:
  - Classify search tokens into three classes, not two: **optional scope modifiers** (`SCOPE_MODIFIERS`), **hierarchy-level tokens** (the `executive`/`head_director`/`manager_lead`/`junior_entry` tiers — words that are near-synonyms _within_ a tier, e.g. `head`↔`director`), and **domain-specific tokens** (everything else by elimination, **including** `mid_core` role-nouns like `engineer`/`nurse`/`analyst` — these are professions, not synonyms of each other, and must not be treated as freely interchangeable just because they share a tier rank).
  - Enforce a **100% mandatory match rule** for all domain-specific search tokens (including `mid_core` role-nouns) against candidate job listings: if a candidate title lacks any domain token from the search query (accounting for `DOMAIN_STEMS`), it is immediately rejected regardless of query length.
  - Hierarchy-level tokens are governed exclusively by the existing `isSeniorityCompatible` tier-rank comparison (not literal-token overlap); scope modifiers never block acceptance on their own.
  - Resolve the `engineer`/`developer` near-synonym question explicitly (design.md's Decision 1 correction recommends leaving `DOMAIN_STEMS` untouched and treating them as distinct, i.e. non-interchangeable, consistent with this proposal's overall precision-over-recall direction) rather than leaving it ambiguous.
- **Multi-Vertical `SENIORITY_TIERS.mid_core` Expansion (`server/utils/searchRelevance.ts`)**:
  - Broaden `SENIORITY_TIERS.mid_core` to include standard role-nouns across Healthcare, Education, Legal, Operations, Science, and Trades.
  - Maintain regression tests ensuring `SCOPE_MODIFIERS` and `ALL_SENIORITY_WORDS` remain strictly disjoint sets.
- **Reed Search Sample Sufficiency & Tier Gate Redesign (`server/utils/reed.ts`)**:
  - Redesign Reed's Tier 1/Tier 2 query progression so that Tier 2 unquoted search is triggered when Tier 1 exact-phrase matches yield an inadequate statistical sample (e.g., raising the salaried threshold from 3 to a statistically robust floor of 15, or merging deduplicated results).
  - Respect Reed's 1,000 requests/day API rate limit by avoiding unnecessary secondary calls when Tier 1 already provides a robust sample ($\ge 15$ salaried jobs), while enabling high-volume unquoted retrieval when Tier 1 is sparse.
- **Provider Architecture Verification (Documentation & Alignment)**:
  - Document that Adzuna (`server/utils/adzuna.ts`) uses title-restricted `title_only` in both Tier 1 (full title) and Tier 2 (anchor phrase) rather than quoted exact phrases, and does not exhibit Reed's 20x unquoted discrepancy — live-verified this review at 451 raw matches for a single `title_only=lead software engineer` call (design.md Decision 4).
  - Document that Jooble (`server/utils/jooble.ts`) is a single-call US fallback querying with `extractSearchAnchorPhrase` and intentionally skips `filterAndRankJobsByRelevance` to preserve fallback availability.
- **Eliminate Redundant Reed/Jooble Histogram Provider Call (`server/api/market-data/salary.ts`, `server/api/market-data/jobs.ts`)** — see `design.md` Decision 5:
  - For Reed (UK) and Jooble (USA fallback) traffic only, derive the histogram `salary.ts` returns from the job-search response `jobs.ts` already fetched and cached (`adzuna_jobs_cache`), instead of independently re-calling `fetchReedData`/`fetchJoobleData` a second time.
  - Fall through to a live provider call only on a cache miss, using the same real `jobType`/`contractType` filters `jobs.ts` uses — fixing the current empty-string parameter-mismatch bug (histogram computed from an unfiltered sample) as part of consolidating the two call sites.
  - Adzuna's dedicated `/histogram` endpoint call (`fetchAdzunaHistogram`) is explicitly **unchanged** — it returns genuinely additive data, not a redundant re-derivation (user-confirmed 2026-09-18).

### Scope & Non-Goals

- **In Scope**:
  - Pure algorithmic domain-token classification and scoring in `server/utils/searchRelevance.ts`, including the three-way (scope-modifier / hierarchy-level / domain-specific) split from design.md's Decision 1 correction.
  - Expanded `SENIORITY_TIERS.mid_core` vocabulary covering Healthcare, Education, Legal, Operations, Science, and Trades.
  - Reed Tier 1 / Tier 2 gating logic and sample threshold update in `server/utils/reed.ts`.
  - Eliminating the redundant Reed/Jooble histogram provider call between `server/api/market-data/jobs.ts` and `server/api/market-data/salary.ts`, and fixing the accompanying jobType/contractType parameter-mismatch bug (design.md Decision 5).
  - Updating capability specs in `openspec/specs/search-relevance-and-specificity/spec.md`, `openspec/specs/reed-api-fallback/spec.md`, and `openspec/specs/jooble-api-fallback/spec.md`.
  - Exhaustive unit test coverage in `server/utils/tests/searchRelevance.spec.ts`, `server/utils/tests/reed.spec.ts`, `server/api/market-data/tests/jobs.spec.ts`, and `server/api/market-data/tests/salary.spec.ts` meeting the 80% per-file coverage requirement.
- **Non-Goals**:
  - Pointing Playwright or automated test suites at live external API endpoints (prohibited by `CODE_STANDARDS.md` §10; all automated tests must use deterministic mocks).
  - Maintaining an unbounded whitelist of domain terms (domain classification is performed strictly by elimination against generic role/seniority/modifier vocabularies).
  - Modifying Adzuna's query structure or its dual-call (search + histogram) architecture — confirmed necessary and out of scope (user-confirmed 2026-09-18; see design.md Decision 5).
  - Modifying Jooble's or Reed's query/filtering behavior beyond Decisions 1–3; the histogram fix (Decision 5) changes only where histogram data is sourced from, not how either provider is queried or filtered.
  - Merging `jobs.ts` and `salary.ts` into a single endpoint, or restructuring `useLocationEngine.ts`'s fetch sequencing — deferred as a larger follow-up (design.md Decision 5 alternatives).
  - Altering client-facing API response schemas or frontend components.

## Capabilities

### New Capabilities

_(None — this change modifies existing search relevance and fallback provider capabilities)._

### Modified Capabilities

- `search-relevance-and-specificity`: Update Requirement "Server-Side Job Title Relevance Scoring" to require 100% match on domain-specific search tokens (including `mid_core` role-nouns) and define the three-way scope-modifier/hierarchy-level/domain-specific token classification algorithm and expanded role-noun vocabulary.
- `reed-api-fallback`: Update Requirement "Reed API Job Data Fetching" and Scenario "Tier 1 search yields insufficient results" to reflect the updated Tier 1 sufficiency threshold and Tier 2 fallback query behavior; update Requirement "Server-Side Statistical Calculation" to require the histogram be derived from the already-fetched job listings instead of a redundant second provider call.
- `jooble-api-fallback`: Update Requirement "Server-Side Statistical Calculation for Jooble" to require the histogram be derived from the already-fetched job listings instead of a redundant second provider call.

## Impact

- **Server Utilities**:
  - `server/utils/searchRelevance.ts` (domain token classification, scoring logic, expanded `mid_core` roles)
  - `server/utils/reed.ts` (Tier 1 sufficiency gate and Tier 2 execution)
- **Server API Routes**:
  - `server/api/market-data/jobs.ts` (job-search cache read by `salary.ts`'s histogram reuse)
  - `server/api/market-data/salary.ts` (Reed/Jooble histogram sourced from `jobs.ts`'s cached result instead of a redundant provider call; parameter-mismatch fix)
- **Unit Tests**:
  - `server/utils/tests/searchRelevance.spec.ts` (unit tests for domain token filtering, 3+-word multi-domain queries, expanded role nouns, regression guards)
  - `server/utils/tests/reed.spec.ts` (unit tests for updated Reed tier threshold, multi-tier execution, and deduplication)
  - `server/api/market-data/tests/salary.spec.ts` (histogram reuse from jobs cache, cache-miss fallback with correct filters, Adzuna path unchanged)
  - `server/api/market-data/tests/jobs.spec.ts` (regression coverage for the cache shape `salary.ts` now depends on)
- **Specification Delta Files**:
  - `openspec/changes/search-relevance-and-reed-tier-gate-fix/specs/search-relevance-and-specificity/spec.md`
  - `openspec/changes/search-relevance-and-reed-tier-gate-fix/specs/reed-api-fallback/spec.md`
  - `openspec/changes/search-relevance-and-reed-tier-gate-fix/specs/jooble-api-fallback/spec.md`
