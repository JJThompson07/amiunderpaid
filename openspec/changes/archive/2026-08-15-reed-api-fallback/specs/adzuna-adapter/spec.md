## ADDED Requirements

### Requirement: Reed API Fallback on Adzuna Limit
The server-side Adzuna API routes (`server/api/adzuna/jobs.ts` and `server/api/adzuna/salary.ts`) SHALL intercept rate limit or quota exceeded errors from the Adzuna API and gracefully fall back to the Reed.co.uk API to fulfill the request.

#### Scenario: Adzuna rate limit exceeded
- **WHEN** the Adzuna API responds with a 403 or quota exceeded error
- **THEN** the system SHALL automatically query the Reed.co.uk API, process the results to match the expected format, and return them to the client.
