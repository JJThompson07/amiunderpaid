# adzuna-adapter Specification

## Purpose

Defines the standard adapter pattern for querying Adzuna market data APIs.

## Requirements

### Requirement: Adzuna API Location Adapter

The server-side Adzuna API routes (`server/api/adzuna/jobs.ts` and `server/api/adzuna/salary.ts`) SHALL intercept incoming location parameters and translate URL-friendly internal slugs to official Adzuna location strings using a constant mapping map before sending the HTTP request.

#### Scenario: Translating an internal slug to an Adzuna string

- **WHEN** the API route receives a `location` query parameter such as "east"
- **THEN** it SHALL map it to "East of England" before appending it to the `where` parameter in the outbound Adzuna API request.

#### Scenario: Fallback for unmapped locations

- **WHEN** the API route receives a `location` query parameter that does not exist in the mapping map (e.g., "Manchester")
- **THEN** it SHALL use the provided string directly as the `where` parameter in the outbound Adzuna API request.

### Requirement: Reed API Fallback on Adzuna Limit

The server-side Adzuna API routes (`server/api/adzuna/jobs.ts` and `server/api/adzuna/salary.ts`) SHALL intercept rate limit or quota exceeded errors from the Adzuna API and gracefully fall back to the Reed.co.uk API to fulfill the request.

#### Scenario: Adzuna rate limit exceeded

- **WHEN** the Adzuna API responds with a 403 or quota exceeded error
- **THEN** the system SHALL automatically query the Reed.co.uk API, process the results to match the expected format, and return them to the client.
