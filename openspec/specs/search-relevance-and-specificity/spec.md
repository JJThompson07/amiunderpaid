# search-relevance-and-specificity Specification

## Purpose
Defines server-side search specificity, role title relevance scoring, seniority hierarchy consistency filtering, and statistical outlier salary trimming to ensure market benchmark data accurately reflects the searched job title.

## Requirements

### Requirement: Server-Side Job Title Relevance Scoring

The server-side market data pipeline SHALL score each candidate job listing against the searched role title and reject listings that fail minimum relevance criteria before computing statistical aggregates or returning search results.

#### Scenario: Matching job title with identical or synonymous terms

- **WHEN** a candidate job title contains the primary role domain terms matching the search title (e.g., "Group Head of Finance" matching "Head of Finance - Group")
- **THEN** the system SHALL score the job above the minimum relevance threshold and include it in statistical calculations.

#### Scenario: Rejecting irrelevant or divergent job titles

- **WHEN** a candidate job title lacks primary role domain tokens or matches only generic noise words
- **THEN** the system SHALL reject the listing from statistical aggregates and search results.

### Requirement: Seniority & Role-Hierarchy Guardrails

When a search query includes a leadership or seniority anchor (e.g., "head", "director", "manager", "chief", "lead", "assistant", "junior", "intern"), candidate listings MUST align with that seniority tier. Candidate listings that possess conflicting or non-leadership role nouns without matching the searched seniority level SHALL be rejected.

#### Scenario: Rejecting mid-level roles on an executive or head-level search

- **WHEN** a user searches for "Group Head of Finance"
- **AND** a candidate listing has the title "Group Financial Accountant" or "Finance Analyst"
- **THEN** the system SHALL identify the seniority mismatch and reject the listing from the dataset.

#### Scenario: Preserving qualified leadership variations

- **WHEN** a user searches for "Group Head of Finance"
- **AND** a candidate listing has the title "Head of Finance & Corporate Accounting" or "Director of Group Finance"
- **THEN** the system SHALL accept the listing as matching the leadership hierarchy.

### Requirement: Search Anchor Phrase Extraction

The search relevance pipeline SHALL expose a function that derives a shortened "anchor phrase" from a full search title by stripping only a _leading run_ of tokens drawn from a defined scope-modifier list — geographic/territorial (`global`, `international`, `worldwide`, `regional`, `national`, `territory`, `area`, `emea`, `apac`, `latam`, `uk`, `us`), organizational scope (`group`, `divisional`, `corporate`, `enterprise`, `commercial`, `central`, `strategic`), contractual/engagement mode (`interim`, `fractional`, `acting`, `contract`, `permanent`, `freelance`), and the intensifier `senior` — up to the first seniority-tier token, while preserving the seniority term and role noun verbatim, for use by exact-phrase provider queries. The modifier list SHALL NOT include any word already classified in a seniority tier (`head`, `chief`, `director`, `lead`, `principal`, `junior`, `associate`, etc.), since the anchor-detection scan searches for the first seniority-tier token — stripping a tier word as a "modifier" would erase the signal the seniority guardrail depends on. If any token preceding the first seniority-tier token is not on the modifier list, or no seniority-tier token exists in the title, the function SHALL return the title unchanged rather than guess.

#### Scenario: Extracting the anchor phrase from a modified title

- **WHEN** the search title is `"Group Head of Finance"`
- **THEN** the system SHALL return `"Head of Finance"` as the anchor phrase.

#### Scenario: Anchor phrase is a no-op on an already-minimal title

- **WHEN** the search title is `"Head of Finance"`
- **THEN** the system SHALL return `"Head of Finance"` unchanged.

#### Scenario: Anchor phrase is a no-op when a pre-token is not a recognized modifier

- **WHEN** the search title is `"Finance Director"` (the token preceding the seniority term "Director" is "Finance", a domain word rather than a recognized scope modifier)
- **THEN** the system SHALL return `"Finance Director"` unchanged rather than strip "Finance".

### Requirement: Statistical Outlier Salary Trimming

The statistical processing pipeline SHALL sanitize raw salary samples by enforcing sanity bounds and trimming statistical outliers using the Interquartile Range (IQR) method before calculating mean salary and histogram distributions.

#### Scenario: Trimming abnormal salary outliers

- **WHEN** a collection of candidate salaries contains extreme values falling outside the IQR boundary `[Q1 - 1.5 * IQR, Q3 + 1.5 * IQR]`
- **THEN** the system SHALL exclude those outlier salaries from the mean calculation and histogram bucket generation.

#### Scenario: Applying full-time sanity salary floor

- **WHEN** a full-time job listing has a salary below the full-time annual sanity threshold (e.g., £15,000 for UK / $25,000 for USA) due to unparsed hourly/daily rates
- **THEN** the system SHALL exclude that entry from annual salary statistics.
