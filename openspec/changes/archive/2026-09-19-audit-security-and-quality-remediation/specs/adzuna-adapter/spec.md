# Spec Delta: adzuna-adapter

## MODIFIED Requirements

### Requirement: Adzuna API Location Adapter

The server-side Adzuna API routes (`server/api/adzuna/jobs.ts` and `server/api/adzuna/salary.ts`) and utility fetchers (`server/utils/adzuna.ts`) SHALL intercept incoming location parameters and translate URL-friendly internal slugs to official Adzuna location strings using a constant mapping map before sending the HTTP request. All outbound HTTP requests to the Adzuna API SHALL enforce an explicit timeout of 6,000 milliseconds (6 seconds) to prevent serverless function hangs and ensure prompt failover on downstream latency.

#### Scenario: Translating an internal slug to an Adzuna string

- **WHEN** the API route receives a `location` query parameter such as "east"
- **THEN** it SHALL map it to "East of England" before appending it to the `where` parameter in the outbound Adzuna API request.

#### Scenario: Fallback for unmapped locations

- **WHEN** the API route receives a `location` query parameter that does not exist in the mapping map (e.g., "Manchester")
- **THEN** it SHALL use the provided string directly as the `where` parameter in the outbound Adzuna API request.

#### Scenario: Upstream request timeout triggers fallback

- **WHEN** the Adzuna API does not respond within 6,000 milliseconds
- **THEN** the request SHALL abort with a timeout error, enabling the market data gateway to fail over to the regional secondary provider.
