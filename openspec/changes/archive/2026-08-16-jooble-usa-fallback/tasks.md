## 1. Provider Implementation

- [x] 1.1 Create `server/utils/providers/jooble.ts` to fetch from `https://jooble.org/api/` using `useRuntimeConfig().joobleApiKey` and map the response to the `MarketJob` interface.
- [x] 1.2 Implement a robust salary parser in `jooble.ts` to convert string descriptions (ranges, monthly, annual, 'k' shorthand) into numeric `minimumSalary`/`maximumSalary`, keeping the original string in `raw_salary`.
- [x] 1.3 Write unit tests for the Jooble provider in `server/utils/providers/tests/jooble.spec.ts` using mocked fetch responses and extensively testing the salary parser logic.
- [x] 1.4 Add `joobleApiKey` to `runtimeConfig` in `nuxt.config.ts`.

## 2. API Gateway Routing

- [x] 2.1 Update `server/api/market-data/jobs.ts` to intercept 0-result responses from Adzuna for the USA region and fallback to `fetchJoobleJobs`.
- [x] 2.2 Update `server/api/market-data/salary.ts` to intercept 0-result responses from Adzuna for the USA region, fallback to Jooble, and calculate histograms dynamically.
- [x] 2.3 Update API tests in `server/api/market-data/tests/jobs.spec.ts` to assert that Jooble is called when Adzuna fails or returns 0 results for USA.

## 3. Verification

- [x] 3.1 Run local verification: `pnpm vitest run` to ensure all tests pass.
- [x] 3.2 Run TypeScript verification: `pnpm nuxi typecheck` to ensure no strict type errors.
