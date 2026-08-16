## Why

During local development, developers need a reliable way to test both the primary Adzuna API and the fallback Reed API logic without artificially triggering rate limits, modifying environment variables, or forcing error responses. A manual UI toggle simplifies local testing of the different data transformations and frontend components for each provider.

## What Changes

- Create a new UI toggle component that is conditionally rendered only during local development (`import.meta.dev`).
- Integrate the toggle into the main search pages (benchmark and salary).
- Update the search orchestration logic (`useAdzuna` or API layer) to respect the manually selected provider when running locally, either by mocking the response or explicitly forcing the Reed fallback path.

## Capabilities

### New Capabilities
- `dev-provider-toggle`: Dev-only UI toggle to switch between search API providers.

### Modified Capabilities
- `job-provider-ui`: Modifying the search UI to conditionally display the dev toggle.

## Impact

- Search Pages (`app/pages/benchmark/[title]/[country]/[[location]].vue`, `app/pages/salary/[title]/[country]/[[location]].vue`)
- Adzuna Composable (`app/composables/useAdzuna.ts`)
- Adzuna API Routes (`server/api/adzuna/jobs.ts`, `server/api/adzuna/salary.ts`) - May need to accept a forced provider override in dev mode.
