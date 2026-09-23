# Spec Delta: search-relevance-and-specificity

## MODIFIED Requirements

### Requirement: Server-Side Job Title Relevance Scoring

The server-side market data pipeline SHALL score each candidate job listing against the searched role title and return both a Tier 1 (exact-match) result set and a Tier 2 (similar/anchor-match) result set simultaneously, up to 100 results per provider, deduplicated so that no job listing appears in both sets.

Search tokens (following punctuation stripping, stop-word removal, and domain stemming) SHALL be partitioned into three disjoint categories:

1. **Scope-modifier tokens**: Tokens present in `SCOPE_MODIFIERS`.
2. **Hierarchy-level tokens**: Tokens present in the `executive`, `head_director`, `manager_lead`, or `junior_entry` tiers of `SENIORITY_TIERS` (excluding `mid_core`).
3. **Domain-specific tokens**: All other tokens, including `mid_core` role-nouns (e.g. `engineer`, `nurse`, `analyst`) — these are professions, not synonyms of one another, and MUST NOT be treated as interchangeable merely because they share a tier rank.

A candidate job listing MUST contain 100% of the domain-specific search tokens present in the search title (accounting for `DOMAIN_STEMS`). If any domain-specific token from the search title is absent in the candidate job title tokens, the system SHALL NOT classify the listing as Tier 1.

Scope-modifier tokens are optional and SHALL NOT be required for a candidate to be accepted into Tier 1. Hierarchy-level tokens SHALL be evaluated exclusively via `isSeniorityCompatible`'s tier-rank comparison (a candidate's highest hierarchy-level tier rank must be >= the search's), not via literal token identity — words within the same hierarchy-level tier (e.g. `head` and `director`, both `head_director`) are equivalent for this purpose. Once all domain-specific tokens match and hierarchy-level compatibility holds, the candidate SHALL be accepted into Tier 1.

Tier 2 candidate job listings SHALL be fetched using relaxed keywords or extracted search anchor phrases and filtered for seniority compatibility. Any candidate that appears in Tier 1 SHALL be excluded from the Tier 2 results list to ensure strict deduplication.

`SENIORITY_TIERS.mid_core` SHALL include cross-vertical role-nouns spanning Healthcare, Education, Legal, Science, Operations, and Trades (including `nurse`, `doctor`, `teacher`, `solicitor`, `coordinator`, `technician`, `electrician`, and related role-nouns) to ensure accurate classification between generic role nouns and domain-defining qualifiers.

#### Scenario: Matching job title with identical or synonymous terms

- **WHEN** a candidate job title contains the primary role domain terms matching the search title (e.g., "Group Head of Finance" matching "Head of Finance - Group")
- **THEN** the system SHALL score the job above the minimum relevance threshold and include it in statistical calculations.

#### Scenario: Rejecting irrelevant or divergent job titles

- **WHEN** a candidate job title lacks primary role domain tokens or matches only generic noise words
- **THEN** the system SHALL reject the listing from statistical aggregates and search results.

#### Scenario: Rejecting 3+-word listing missing domain token despite matching hierarchy-level token

- **WHEN** a user searches for `"Lead Software Engineer"` (domain tokens: `"software"`, `"engineer"`; hierarchy-level token: `"lead"`)
- **AND** a candidate job listing has the title `"Lead Mechanical Engineer"`, `"Lead Electrical Engineer"`, or `"RF Lead Engineer"`
- **THEN** the system SHALL reject the candidate listing because it lacks the 100%-required domain token `"software"`, even though its hierarchy-level token `"lead"` (and, for the first two, `"engineer"`) matches.

#### Scenario: Accepting 3+-word listing with full domain match and compatible seniority

- **WHEN** a user searches for `"Lead Software Engineer"` (domain tokens: `"software"`, `"engineer"`; hierarchy-level token: `"lead"`)
- **AND** a candidate job listing has the title `"Lead Software & Cloud Engineer"`
- **THEN** the system SHALL accept the candidate listing because all domain tokens (`"software"`, `"engineer"`) are present and the hierarchy-level token `"lead"` matches.

#### Scenario: Rejecting a listing that substitutes one mid_core role-noun for another

- **WHEN** a user searches for `"Lead Software Engineer"` (domain tokens: `"software"`, `"engineer"`)
- **AND** a candidate job listing has the title `"Lead Software Developer"`
- **THEN** the system SHALL reject the candidate listing because the domain token `"engineer"` is absent — `"developer"` is a distinct `mid_core` profession token, not a literal or `DOMAIN_STEMS` match for `"engineer"`, and `mid_core` role-nouns are not treated as interchangeable with one another.

#### Scenario: Accepting a listing that omits an optional scope-modifier token

- **WHEN** a user searches for `"Senior Financial Analyst"` (domain token: `"finance"`, via `DOMAIN_STEMS`; scope-modifier token: `"senior"`)
- **AND** a candidate job listing has the title `"Financial Analyst"`
- **THEN** the system SHALL accept the candidate listing because the domain token `"finance"` is present and `"senior"` is an optional scope-modifier that is not required for acceptance.

#### Scenario: Accepting a listing that substitutes a same-tier hierarchy-level word

- **WHEN** a user searches for `"Head of Operations"` (domain token: `"operations"`; hierarchy-level token: `"head"`, tier `head_director`)
- **AND** a candidate job listing has the title `"Director of Operations"`
- **THEN** the system SHALL accept the candidate listing because the domain token `"operations"` is present and `"director"` shares the `head_director` tier with `"head"`, satisfying hierarchy-level compatibility via tier rank rather than literal token match.

#### Scenario: Rejecting a listing whose only shared tokens are cross-profession mid_core role-nouns at the same rank

- **WHEN** a user searches for `"Senior Engineer"` (domain token: `"engineer"`; scope-modifier token: `"senior"`)
- **AND** a candidate job listing has the title `"Senior Nurse"`
- **THEN** the system SHALL reject the candidate listing because the domain token `"engineer"` is absent, even though `"nurse"` shares the same `mid_core` tier rank as `"engineer"` — tier-rank compatibility alone MUST NOT substitute for the domain-token match requirement on `mid_core` role-nouns.

#### Scenario: Domain matching in non-IT multi-word roles

- **WHEN** a user searches for `"Lead Veterinary Nurse"` (domain tokens: `"veterinary"`, `"nurse"`; hierarchy-level token: `"lead"`)
- **AND** a candidate job listing has the title `"Lead Dental Nurse"`
- **THEN** the system SHALL reject the listing due to the missing domain token `"veterinary"`.

#### Scenario: Returning both Tier 1 exact matches and Tier 2 similar roles

- **WHEN** a provider (Reed, Adzuna, Jooble) returns candidate jobs from both Tier 1 (exact phrase/title) and Tier 2 (anchor phrase/broader keywords) searches
- **THEN** the system SHALL return `results` populated with Tier 1 exact matches
- **AND** return `similarResults` populated with Tier 2 similar matches deduplicated against Tier 1
- **AND** compute statistical aggregates (mean, histogram) prioritizing the combined relevant sample.
