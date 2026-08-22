## 1. jobs.ts

- [x] 1.1 In `server/api/market-data/jobs.ts` around `:278-293`, branch the `expiresAt` calculation on `cleanData.provider`: if present and not `'adzuna'`, set `expiresAt` to now + 24 hours; otherwise keep the existing `cacheDays` (default 30) path.
- [x] 1.2 Add a unit test asserting an Adzuna-sourced response gets the configured `cacheDays` expiry, and a fallback-sourced response gets a 24-hour expiry.

## 2. salary.ts

- [x] 2.1 Apply the identical branch to `server/api/market-data/salary.ts` around `:229-242`.
- [x] 2.2 At `:217-224`, only read `categoryTag` from the jobs cache when `cleanData.provider === 'adzuna'` (or is absent); force `categoryTag = 'unknown'` for fallback-provider responses so a long per-category `cacheDays` cannot leak onto fallback data.
- [x] 2.3 Add the equivalent unit test pair for `salary.ts`.

## 3. Verification

- [x] 3.1 Run local verification `pnpm vitest run`.
