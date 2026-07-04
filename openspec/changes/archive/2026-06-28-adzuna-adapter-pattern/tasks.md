## 1. Constants Configuration

- [x] 1.1 Create `server/constants/locations.ts`.
- [x] 1.2 Export a constant `ADZUNA_LOCATION_MAP` of type `Record<string, string>` containing the mapping between our internal region slugs (e.g., `'east'`) and Adzuna official location strings (e.g., `'East of England'`).

## 2. API Implementation

- [x] 2.1 In `server/api/adzuna/jobs.ts`, import `ADZUNA_LOCATION_MAP`.
- [x] 2.2 Update the location handling block to convert the incoming `locationStr` to a slug, check if it exists in the map, and if so, assign the mapped Adzuna string to `params.where`.
- [x] 2.3 In `server/api/adzuna/salary.ts`, import `ADZUNA_LOCATION_MAP`.
- [x] 2.4 Apply the identical adapter logic to the location handling block before the Adzuna histogram request is made.

## 3. Verification

- [x] 3.1 Run `pnpm format` to ensure formatting passes.
- [x] 3.2 Run `pnpm eslint .` to ensure no linting errors.
- [x] 3.3 Run `pnpm nuxi typecheck` to ensure no typescript errors are introduced.
