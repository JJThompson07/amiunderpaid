## 1. Credential access: sync-algolia.post.ts

- [x] 1.1 Replace `process.env.ALGOLIA_ADMIN_KEY` / `process.env.ALGOLIA_APPLICATION_ID` reads in `server/api/admin/sync-algolia.post.ts` with `useRuntimeConfig()`'s `algoliaAdminApiKey` / `algoliaApplicationId` (already registered in `nuxt.config.ts`, verified — no new secret registration needed).
- [x] 1.2 Update `server/api/admin/tests/sync-algolia.spec.ts` to stub `useRuntimeConfig` (matching the pattern already used in `server/api/market-data/tests/categories.spec.ts`) instead of `vi.stubEnv('ALGOLIA_ADMIN_KEY', ...)` / `vi.stubEnv('ALGOLIA_APPLICATION_ID', ...)`, keeping the same four existing test cases (non-array payload, missing-credentials 500, successful sync, saveObjects failure wrapped).
- [x] 1.3 Run `pnpm vitest run server/api/admin/tests/sync-algolia.spec.ts` and confirm all 4 tests still pass.

## 2. Credential access: job-groups/migrate.ts

- [x] 2.1 Replace `process.env.ALGOLIA_APPLICATION_ID` / `process.env.ALGOLIA_ADMIN_KEY` reads in `server/api/admin/job-groups/migrate.ts` with `useRuntimeConfig()`'s `algoliaApplicationId` / `algoliaAdminApiKey`.
- [x] 2.2 Update `server/api/admin/job-groups/tests/migrate.spec.ts` to stub `useRuntimeConfig` instead of `vi.stubEnv('ALGOLIA_APPLICATION_ID', ...)` / `vi.stubEnv('ALGOLIA_ADMIN_KEY', ...)`, keeping the same five existing test cases (missing country, missing-credentials 500, empty Firestore collection, >200-title chunking, empty-titles single record, Algolia push failure wrapped).
- [x] 2.3 Run `pnpm vitest run server/api/admin/job-groups/tests/migrate.spec.ts` and confirm all tests still pass.

## 3. Credential access: market-data/categories.ts

- [x] 3.1 In `server/api/market-data/categories.ts`, remove the `config.public?.adzunaAppId` / `config.public?.adzunaAppKey` and `process.env.adzunaAppId` / `process.env.adzunaAppKey` fallback branches from the credential lookup, reading only `config.adzunaAppId` / `config.adzunaAppKey` (verified: no `public.adzunaApp*` key exists in `nuxt.config.ts`, so this changes no runtime behavior).
- [x] 3.2 Run `pnpm vitest run server/api/market-data/tests/categories.spec.ts` and confirm the existing 5 tests still pass unmodified (they already only stub the private `useRuntimeConfig` shape, not `config.public`).

## 4. Fix swallowed 404 in leads/submit.post.ts

- [x] 4.1 In `server/api/user/leads/submit.post.ts`'s outer `catch` block, detect an already-classified error (a caught value with a numeric `statusCode`, i.e. the `H3Error` already thrown by the `!recruiterUserDoc.exists` branch) and re-throw it as-is; keep the existing generic `500` fallback for every other caught value.
- [x] 4.2 Update `server/api/user/leads/tests/submit.spec.ts`'s test at line 69 ("wraps a missing recruiter in the generic 500 (the bare catch swallows the 404)") to assert the corrected behavior: the handler now rejects with the specific 404 `'Recruiter not found'` message, not the generic 500. Rename the test description to match.
- [x] 4.3 Confirm the existing "wraps an unexpected failure in a generic 500" test (line 128, Firestore write failure) still passes unmodified — it must still hit the generic-500 fallback since a plain `Error` has no `statusCode`.
- [x] 4.4 Run `pnpm vitest run server/api/user/leads/tests/submit.spec.ts` and confirm all tests pass.

## 5. cspell / spellcheck

- [x] 5.1 Add the 6 distinct unknown words currently flagged by `pnpm lint`'s `spellcheck` step (`unstub`, `sugg`, `unparseable`, `honors`, `slugifying`, `slugified`) to `cspell.config.json`'s `words` list.
- [x] 5.2 Run `pnpm spellcheck` (the underlying script `pnpm lint` invokes first) and confirm it exits 0 with 0 issues found.

## 6. Spec sync prep & full verification

- [x] 6.1 Confirm `CODE_STANDARDS.md` needs no new addition for this change (all three fixes bring existing code into compliance with already-documented §9.1/§9.3 rules; no new convention was discovered).
- [x] 6.2 Run `pnpm nuxi typecheck` and confirm exit code 0.
- [x] 6.3 Run `pnpm vitest run` (full suite) and confirm all tests pass, with no regressions outside the 4 files touched. (745/745 passed, same count as pre-change baseline.)
- [x] 6.4 Run `pnpm run test:coverage` and confirm `server/api/admin/sync-algolia.post.ts`, `server/api/admin/job-groups/migrate.ts`, `server/api/market-data/categories.ts`, and `server/api/user/leads/submit.post.ts` all remain ≥80% on all four metrics. (Coverage run exits 0; categories.ts is 100/100/100/100 and thus omitted from the `skipFull` text table — confirmed present and passing via `check-standards.ts`/full exit code, not just omission.)
- [x] 6.5 Run `pnpm lint`. **Note**: the pipeline's `spellcheck` step now passes (0 issues, was the explicit target of this task). The full pipeline still exits 1 due to pre-existing `prettier --check` formatting drift and 2 pre-existing `@typescript-eslint/explicit-function-return-type` warnings, all in ~29-31 files this change did not touch (verified via `git status`/`git diff` — none of the flagged lines fall within this change's diff). Out of scope per the same judgment applied to cspell before this change: these are pre-existing repo debt, not introduced or worsened here. `pnpm exec prettier --check` and `pnpm exec eslint --max-warnings 0`, `check-standards.ts`, and `structure-lint.ts` all pass cleanly when scoped to this change's 8 touched files.
- [x] 6.6 Run `pnpm test:e2e` and confirm no regressions. (20/20 passed.)
