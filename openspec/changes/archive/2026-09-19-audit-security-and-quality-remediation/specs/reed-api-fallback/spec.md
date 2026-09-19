# Spec Delta: reed-api-fallback

## MODIFIED Requirements

### Requirement: Reed API Job Data Fetching

The system SHALL fetch active job vacancies from the Reed.co.uk API using the provided job title and location, primarily acting as the primary provider for UK traffic. Outbound HTTP requests to the Reed API SHALL enforce an explicit timeout of 6,000 milliseconds (6 seconds) to prevent serverless function hangs and ensure prompt failover to secondary providers on downstream degradation. The initial (Tier 1) query SHALL quote the full search title OR'd with the extracted anchor phrase (see `search-relevance-and-specificity`) — e.g. `"${title}" OR "${anchorPhrase}"` — for exact-phrase matching, or just the quoted full title alone when anchor extraction is a no-op, falling back to an unquoted full-title search when Tier 1 returns fewer than 15 relevant results with salaries.

#### Scenario: Successful job data retrieval

- **WHEN** the system requests jobs with a valid title and location for the UK region
- **THEN** it SHALL return a list of job objects containing `minimumSalary` and `maximumSalary`.

#### Scenario: Tier 1 combines the full title and anchor phrase via OR

- **WHEN** the search title is `"Group Head of Finance"` (anchor extraction yields `"Head of Finance"`, distinct from the full title)
- **THEN** the system SHALL query Reed with `keywords: '"Group Head of Finance" OR "Head of Finance"'`.

#### Scenario: Tier 1 search yields insufficient results

- **WHEN** the Tier 1 quoted search (full title, optionally OR'd with the anchor phrase) returns fewer than 15 relevant results with salaries
- **THEN** the system SHALL fall back to an unquoted search using the full original search title, applying the same domain-token relevance filter and IQR salary outlier trimming.

#### Scenario: Tier 1 search yields sufficient results

- **WHEN** the Tier 1 quoted search returns 15 or more relevant results with salaries
- **THEN** the system SHALL return the Tier 1 results directly without making a secondary unquoted API call, conserving upstream API quota.

#### Scenario: Upstream request timeout triggers fallback

- **WHEN** the Reed API does not respond within 6,000 milliseconds
- **THEN** the request SHALL abort with a timeout error, enabling the market data gateway to fail over to the regional secondary provider.
