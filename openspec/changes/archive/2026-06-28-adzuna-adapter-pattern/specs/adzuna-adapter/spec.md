## ADDED Requirements

### Requirement: Adzuna API Location Adapter

The server-side Adzuna API routes (`server/api/adzuna/jobs.ts` and `server/api/adzuna/salary.ts`) SHALL intercept incoming location parameters and translate URL-friendly internal slugs to official Adzuna location strings using a constant mapping map before sending the HTTP request.

#### Scenario: Translating an internal slug to an Adzuna string

- **WHEN** the API route receives a `location` query parameter such as "east"
- **THEN** it SHALL map it to "East of England" before appending it to the `where` parameter in the outbound Adzuna API request.

#### Scenario: Fallback for unmapped locations

- **WHEN** the API route receives a `location` query parameter that does not exist in the mapping map (e.g., "Manchester")
- **THEN** it SHALL use the provided string directly as the `where` parameter in the outbound Adzuna API request.
