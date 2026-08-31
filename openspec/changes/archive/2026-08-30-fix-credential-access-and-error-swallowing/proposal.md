## Why

Three standards violations surfaced during the `server-coverage` change's review that were explicitly out of scope for that change: (1) three server routes read Algolia/Adzuna credentials via raw `process.env` instead of Nuxt's private `runtimeConfig`, violating CODE_STANDARDS.md §9.1 and bypassing the startup validation that registering a secret in `nuxt.config.ts` provides; (2) `server/api/user/leads/submit.post.ts` has a bare `catch {}` that silently converts a specific, already-thrown 404 "Recruiter not found" `H3Error` into a generic 500, discarding a real distinction the code went out of its way to create; (3) the repo's `pnpm lint` pipeline's `spellcheck` step (its first step, run before typecheck/prettier/eslint) currently fails with 17 unknown-word findings across 6 distinct words in test files, blocking a clean `pnpm lint` run that CLAUDE.md/AGENTS.md require before concluding work.

## What Changes

- Replace `process.env.ALGOLIA_ADMIN_KEY` / `process.env.ALGOLIA_APPLICATION_ID` reads in `server/api/admin/sync-algolia.post.ts` and `server/api/admin/job-groups/migrate.ts` with `useRuntimeConfig()`-based private `runtimeConfig` access; register `algoliaAdminKey`/`algoliaApplicationId` in `nuxt.config.ts`'s private `runtimeConfig` if not already present.
- Remove the `process.env.adzunaAppId` / `process.env.adzunaAppKey` fallback branch in `server/api/market-data/categories.ts`'s credential lookup (its `config.adzunaAppId || config.public?.adzunaAppId || process.env.adzunaAppId` chain is exactly the forbidden "chained fallback that permits public/env access" pattern CODE_STANDARDS.md §9.1 calls out), keeping only the private `runtimeConfig` read.
- Fix `server/api/user/leads/submit.post.ts`'s bare `catch {}` so the 404 "Recruiter not found" error it already throws internally propagates to the client as a 404 instead of being silently downgraded to a generic 500 by the outer catch; other unexpected failures in the same `try` block continue to surface as an opaque 500 per CODE_STANDARDS.md §9.3.
- Add the 6 distinct unknown words (`unstub`, `sugg`, `unparseable`, `honors`, `slugifying`, `slugified`) currently flagged by `pnpm lint`'s spellcheck step to `cspell.config.json`'s `words` list, following the existing precedent of accepting American-spelling variants (`labor`, `defense`) alongside the repo's `en-gb` base dictionary.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `leads-relay-security`: adds a requirement that a lead submission for a recruiter id that does not exist in Firestore SHALL surface as a 404, not a generic 500 — the endpoint's outer error handler must not mask a specific, already-classified error from an inner step.
- `eslint-strict-remediation`: extends the existing "Running `pnpm lint`" scenario to also require the pipeline's `spellcheck` (cspell) step to exit 0, not just the eslint step.

## Impact

- `server/api/admin/sync-algolia.post.ts`, `server/api/admin/job-groups/migrate.ts`, `server/api/market-data/categories.ts` — credential access pattern only, no behavior change for valid requests.
- `nuxt.config.ts` — may gain 1-2 new private `runtimeConfig` keys if not already registered (verify during implementation before assuming).
- `server/api/user/leads/submit.post.ts` — observable behavior change: a lead submitted against a nonexistent `recruiterId` now returns 404 instead of 500.
- `cspell.config.json` — dictionary-only change, no code behavior impact.
- Existing tests for all four server files and the lint pipeline; new/updated unit tests required for the leads/submit 404 behavior change per CODE_STANDARDS.md §8.
