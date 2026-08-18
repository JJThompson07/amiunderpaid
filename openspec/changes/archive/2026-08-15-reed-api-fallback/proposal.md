## Why

The current API integration relies on Adzuna, which has a strict monthly limit of 2,500 requests (equivalent to 1,250 searches since each search requires two calls). This limit is quickly exhausted, leaving the platform unable to fetch salary and job data. Integrating the Reed.co.uk Jobseeker API as a fallback will ensure the site continues to operate smoothly when Adzuna's limits are reached.

## What Changes

- Implement a fallback mechanism in the server API to switch to the Reed.co.uk API when Adzuna throws a rate limit or quota exhausted error.
- Calculate necessary statistics on the server side from Reed's job vacancies (percentiles, mean, median, and histogram data) so the returned object closely matches the Adzuna object.
- Create a new frontend component for Reed job listings to display the top 10 highest-salary jobs from the search results, linking directly to reed.co.uk.
- Update the job list section title dynamically ("Jobs by adzuna" vs "Jobs By Reed" with appropriate links).
- Update the "Data sources" page to transform the existing Adzuna tile into a combined "Adzuna & Reed Intelligence" tile, indicating that real-time market shifts are powered by both platforms. The Crowdsourced tile will remain.
- Note: Historical data will not be available through Reed as their API only queries active vacancies.

## Capabilities

### New Capabilities

- `reed-api-fallback`: Handles fetching job data from Reed.co.uk API and converting raw job bounds (minimum/maximum salary) into the aggregated histogram format required by the frontend.
- `job-provider-ui`: Updates the frontend application to dynamically identify the data provider (Adzuna or Reed) and adjust component rendering, section titles, and job listing layouts.

### Modified Capabilities

- `adzuna-adapter`: Update the server-side logic (e.g., `server/api/adzuna/salary.ts` and `server/api/adzuna/jobs.ts`) to intercept rate limit errors and invoke the Reed API fallback adapter.
- `admin-search-log-metrics`: Enhance search log entries to include the data provider (Adzuna or Reed) and display this provider within the admin dashboard search logs table.

## Impact

- `server/api/adzuna/jobs.ts` and `server/api/adzuna/salary.ts` will have updated error handling and fallback logic.
- A new server utility or adapter for Reed API will be created.
- Frontend job list components and texts will be updated to handle both Adzuna and Reed seamlessly.
- Application configurations will need Reed.co.uk API credentials.
