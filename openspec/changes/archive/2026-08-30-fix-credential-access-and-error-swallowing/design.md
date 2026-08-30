## Context

Three unrelated but small hygiene fixes surfaced while validating the `server-coverage` change, deliberately left out of that change's scope: a credential-access standards violation, a swallowed error, and a blocked spellcheck step. Verified during planning (CODE_STANDARDS.md §10):

- `nuxt.config.ts` already registers `algoliaApplicationId`, `algoliaAdminApiKey`, `adzunaAppId`, and `adzunaAppKey` in the private `runtimeConfig` block (lines 154-162) — the three offending server files simply aren't using them, reading `process.env` directly instead. No new secret registration is required.
- `server/api/user/leads/submit.post.ts` already throws a correctly-shaped `createError({ statusCode: 404, message: 'Recruiter not found' })` internally (line 39); the outer `catch {}` (line 100) discards it unconditionally and always re-throws a generic 500. The fix is to detect and re-throw an already-classified `H3Error` before falling back to the generic 500 for everything else.
- `cspell.config.json` already accepts other American-spelling/technical-jargon words (`labor`, `defense`, `unslugify`) via its `words` list — the fix follows that existing precedent exactly, no new mechanism needed.

## Goals / Non-Goals

**Goals:**

- Bring the three server files into compliance with CODE_STANDARDS.md §9.1 (private `runtimeConfig` only, no `process.env`, no `config.public` fallback chains).
- Make the leads/submit endpoint return 404 for a nonexistent recruiter instead of masking it as a 500, while every other unexpected failure still surfaces as an opaque 500 per §9.3.
- Get `pnpm lint` to exit 0 end-to-end (spellcheck is its first step).

**Non-Goals:**

- No change to Adzuna/Algolia API behavior, request shape, or credentials themselves — this is a read-path change only.
- No broader error-handling refactor of `leads/submit.post.ts` beyond the one masked case; the sanitization, email-queueing, and Firestore-write logic are unchanged.
- No cspell rule/config restructuring — just the minimal word-list addition needed to pass.

## Decisions

- **Credential reads**: use `useRuntimeConfig()` inside each handler (matching the pattern already used in `server/api/market-data/categories.ts` for the `config` variable, and in `server/api/stripe/*` for Stripe secrets) rather than passing config in via DI/params — this is the established pattern for every other server route in the repo.
- **`categories.ts`'s existing `config.adzunaAppId || config.public?.adzunaAppId || process.env.adzunaAppId` chain**: drop straight to `config.adzunaAppId` / `config.adzunaAppKey`. Since both are already registered as private-only keys with no `public.adzunaApp*` counterpart declared anywhere in `nuxt.config.ts`, the `config.public?.adzunaAppId` branch was already always `undefined` — removing it changes no runtime behavior, only removes dead/forbidden-pattern code.
- **Leads/submit error handling**: re-throw when the caught value is already an `H3Error`-shaped object (has a numeric `statusCode`), otherwise fall back to the existing generic 500. This distinguishes "a step we already classified" from "something unexpected blew up" without introducing a new taxonomy of error types.
- **cspell fix**: add words to the config's `words` list rather than editing the prose in 6 test files, consistent with the existing precedent of accepting `labor`/`defense`/`anymore` (American spellings) and jargon (`unslugify`, `dedup`) into the shared dictionary instead of rewriting test descriptions to avoid them.

## Risks / Trade-offs

- [Risk] Removing the `config.public?.adzunaAppId` fallback in `categories.ts` could theoretically break local dev if some environment relies on a `public.adzunaAppId` that exists only in a `.env` not visible during this review → Mitigation: verify via `grep` that no `public.adzunaApp*` key is declared anywhere in `nuxt.config.ts` before removing the fallback (done above); if a future secret is genuinely needed on the client, it must be registered in `public` explicitly and separately, not smuggled in via a private-key fallback chain.
- [Risk] Distinguishing "already-classified" errors by checking for a numeric `statusCode` is a slightly implicit contract → Mitigation: this matches the shape `createError()` (h3) actually produces, and unit tests will assert both branches (404 propagation and generic-500 fallback) directly.

## Migration Plan

Straightforward code-level change, no data migration. Deploys as part of the normal PR/merge flow; no feature flag or rollback plan beyond a standard revert, since none of the three fixes are irreversible or destructive.

## Open Questions

None — all three fixes verified against current file contents before writing this design.
