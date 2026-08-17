# Proposal: Admin Security Audit Fixes

## Why

A recent codebase audit revealed critical security regressions in several `/api/admin/` endpoints.

1. `clear-algolia.post.ts` and `configure-algolia.post.ts` lack authentication, exposing the search index to unauthenticated attacks.
2. Multiple files read secrets directly from `process.env` instead of Nuxt's secure `runtimeConfig`.
3. Error messages leak provider names and internal error details to the client.

These violate sections 9.1, 9.2, and 9.3 of `CODE_STANDARDS.md`.

## What

- Wrap `clear-algolia.post.ts` and `configure-algolia.post.ts` with `await verifyAdmin(event)`.
- Refactor all `/api/admin/` routes to exclusively use `useRuntimeConfig()` for secrets (e.g. `ALGOLIA_ADMIN_KEY`, `adzunaAppId`).
- Obfuscate server error messages inside `createError` blocks to prevent information leakage.
- Register `algoliaAdminKey` in `nuxt.config.ts` if not already present.

## Scope

- `server/api/admin/clear-algolia.post.ts`
- `server/api/admin/configure-algolia.post.ts`
- `server/api/admin/adzuna-locations.get.ts`
- `nuxt.config.ts` (if needed for `algoliaAdminKey`)

## Non-Goals

- We are not refactoring the Algolia indexing logic itself, only securing the endpoints.
- We are not addressing the `any` types in the Vue components during this specific OpenSpec change (that will be a separate chore).
