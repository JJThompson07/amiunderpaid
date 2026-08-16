## Context

The `market-data` API Gateway dynamically routes requests to job data providers based on the user's selected country. The UK region uses Reed.co.uk primarily, falling back to Adzuna on failure/empty results. The USA region currently uses Adzuna primarily, but lacks a fallback provider when Adzuna fails or returns 0 results. The user has provided a Jooble API key and tested the API, which successfully returned results for USA data. Jooble will serve as the fallback for USA.

## Goals / Non-Goals

**Goals:**
- Implement the `fetchJoobleJobs` utility method mapped strictly to the existing `MarketJob` interface.
- Implement the fallback logic for USA region in `server/api/market-data/jobs.ts` and `server/api/market-data/salary.ts` to utilize Jooble when Adzuna returns zero results.
- Dynamically calculate salary histograms and averages for Jooble data, similar to what we do for Reed.

**Non-Goals:**
- Do not modify UK fallback routing.
- Do not modify Adzuna's primary implementation.

## Decisions

**1. Jooble SDK vs Native Fetch**
- **Decision**: Use native `fetch` via Nitro's `$fetch` (or standard fetch) for the Jooble API.
- **Rationale**: The API is a simple REST POST request returning JSON. Using `$fetch` avoids introducing external dependencies for a single API call and aligns with the project's minimal dependency goals.

**2. Salary Parsing from Jooble**
- **Decision**: Jooble returns a `salary` field which is an unstructured string. We will implement a robust regex-based parser in `fetchJoobleJobs` to normalize this string into numeric `minimumSalary` and `maximumSalary`.
  - Ranges (e.g., "$97k - $206k"): Extract both, but use the maximum value as the definitive salary or set both accordingly.
  - Monthly (e.g., "$5,000 per month"): Multiply by 12.
  - Annual/Singular (e.g., "$200k"): Parse 'k' as 1000.
  - The raw string will be preserved in the `raw_salary` field on the internal `MarketJob` object.
- **Rationale**: Keeps the internal architecture uniform so downstream histogram and statistical calculations process standard numeric boundaries regardless of which API supplied the data.

**3. API Key Management**
- **Decision**: `JOOBLE_API_KEY` will be read solely via `useRuntimeConfig().joobleApiKey`.
- **Rationale**: Strict compliance with security guidelines ensuring server-only credentials.

## Risks / Trade-offs

- **Risk: Jooble salary data is empty.** → *Mitigation*: The `MarketJob` interface accommodates undefined `minimumSalary` and `maximumSalary`. If computing histograms and no jobs have salaries, the API will return a 404 or empty histogram to avoid displaying skewed data on the client.
- **Risk: Rate limits on Jooble API.** → *Mitigation*: Fallback provider is only hit if Adzuna fails. Given this is secondary, volume is naturally lower. If Jooble also rate limits, we will propagate a 503 back to the client.
