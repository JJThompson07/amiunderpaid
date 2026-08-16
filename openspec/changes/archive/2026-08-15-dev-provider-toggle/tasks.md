## 1. Backend Updates

- [x] 1.1 Update `server/api/adzuna/jobs.ts` to check for a `devProvider` query string. If `devProvider === 'reed'` and `process.dev` is true, immediately bypass Adzuna fetch and execute the Reed fallback logic.
- [x] 1.2 Update `server/api/adzuna/salary.ts` similarly to check `devProvider` and execute Reed fallback if requested and `process.dev` is true.

## 2. Frontend Composables

- [x] 2.1 Update `app/composables/useAdzuna.ts` to append an optional `devProvider` string to the query parameters in `fetchJobs` and `fetchSalary`. Update `app/composables/tests/useAdzuna.spec.ts` accordingly.
- [x] 2.2 Create a new file `app/composables/useDevProviderOverride.ts` that exports a simple `useState<string>('devProviderOverride', () => 'auto')` to track the local override state. Include a basic unit test file.

## 3. UI Implementation

- [x] 3.1 Create `app/components/AmIDevProviderToggle.vue`. This component should render a simple radio group or select dropdown (Auto, Adzuna, Reed) bound to `useDevProviderOverride()`.
- [x] 3.2 Update `app/pages/benchmark/[title]/[country]/[[location]].vue` to include `<AmIDevProviderToggle v-if="import.meta.dev" />` near the job listings section. Watch the `devProviderOverride` state so that changing it triggers a fresh fetch using `useAdzuna`.
- [x] 3.3 Update `app/pages/salary/[title]/[country]/[[location]].vue` identically to the benchmark page to support the dev toggle.

## 4. Verification

- [x] 4.1 Run local verification `pnpm vitest run` and `pnpm nuxi typecheck` to ensure no regressions and strict types are maintained.
