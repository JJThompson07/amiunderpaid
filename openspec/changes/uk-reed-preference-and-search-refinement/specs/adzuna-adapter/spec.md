# Spec Delta: adzuna-adapter

## MODIFIED Requirements

### Requirement: Reed API Fallback on Adzuna Limit

The server-side market data API routes (`server/api/market-data/jobs.ts` and `server/api/market-data/salary.ts`) SHALL utilize Adzuna as the fallback provider for UK traffic when Reed yields zero results or fails, and as the primary provider for USA traffic with Jooble fallback.

#### Scenario: Adzuna rate limit exceeded
- **WHEN** the Adzuna API responds with a 429, 403, or quota exceeded error during a USA request
- **THEN** the system SHALL automatically query the Jooble API, process the results to match the expected format, and return them to the client.

#### Scenario: Adzuna serves as UK fallback
- **WHEN** a UK market data query produces zero results or encounters an error from Reed
- **THEN** the system SHALL automatically query Adzuna API, format the results, and return them with `provider: 'adzuna'`.
