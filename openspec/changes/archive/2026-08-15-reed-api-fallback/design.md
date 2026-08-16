## Context

The system currently uses the Adzuna API for job searches and salary distributions. See `proposal.md` for the motivation to add Reed.co.uk API as a fallback.

## Goals / Non-Goals

**Goals:**
- Provide a robust server-side fallback mechanism when the Adzuna API is rate-limited.
- Seamlessly transform Reed API data into the format expected by the frontend composables (`HistogramData` and `AdzunaJob`).

**Non-Goals:**
- Do not migrate entirely away from Adzuna; Reed is strictly a fallback.
- Do not fetch historical data from Reed, as it only supports current active vacancies.

## Decisions

**1. Fallback Injection Point**
- **Decision:** Implement the fallback logic directly in `server/api/adzuna/jobs.ts` and `server/api/adzuna/salary.ts`.
- **Rationale:** Catching the Adzuna fetch error (e.g., 403 or 429) inside the server routes allows us to fetch from Reed and return a compatible JSON structure, with an added `provider` field.

**2. Data Transformation and Statistical Calculation**
- **Decision:** Create a new utility file `server/utils/reed.ts` to handle fetching from Reed, transforming their raw job schema, and calculating statistics.
- **Rationale:** Reed API does not provide aggregate statistics directly. We will fetch a sample of jobs, compute the percentiles, median, mean, and generate histogram buckets.

**3. Frontend Provider Awareness**
- **Decision:** The API response will include a `provider: 'adzuna' | 'reed'` field. The `useAdzuna` composable will expose this to the UI.
- **Rationale:** This allows the UI to conditionally render the title ("Jobs by adzuna" vs "Jobs By Reed") and use the correct job listing component without creating separate frontend logic flows.

**4. Reed Job Component**
- **Decision:** Create a new Vue component (`Section/Reed/JobListing.vue` or similar) specifically for formatting Reed job data. The top 10 highest-salary jobs will be extracted and passed to this component.
- **Rationale:** While similar, Reed's job format requires distinct styling and URL handling compared to Adzuna. A separate component keeps it clean.

## Risks / Trade-offs

- **[Risk] Sample Size for Statistics:** Computing a histogram from a single page of Reed API results (up to 100 jobs) may produce a less accurate or more sparse distribution compared to Adzuna's native aggregate API.
  - *Mitigation:* The frontend already gracefully handles sparse histograms. This is acceptable for a fallback state compared to showing no data at all.
- **[Risk] Rate Limiting on Reed:** We might hit rate limits on Reed as well if traffic is extremely high.
  - *Mitigation:* Rely on the existing server-side Firestore cache (`adzuna_distribution_cache` and `adzuna_jobs_cache`) which caches results by search key. The cached result will transparently serve subsequent users.
