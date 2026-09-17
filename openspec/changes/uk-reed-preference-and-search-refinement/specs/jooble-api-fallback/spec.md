# Spec Delta: jooble-api-fallback

## MODIFIED Requirements

### Requirement: Jooble API Job Data Fetching

The system SHALL fetch active job vacancies from the Jooble API using the extracted anchor phrase (see `search-relevance-and-specificity`) as the `keywords` query, not the full raw search title, and the provided location.

#### Scenario: Successful job data retrieval

- **WHEN** the system requests jobs with a valid title and location in the USA region
- **THEN** it SHALL return a list of job objects matching the internal MarketJob interface.

#### Scenario: Querying with the anchor phrase rather than the full title

- **WHEN** the search title is `"Group Head of Finance"` (anchor extraction yields `"Head of Finance"`)
- **THEN** the system SHALL query Jooble with `keywords: "Head of Finance"`, not `"Group Head of Finance"`.
