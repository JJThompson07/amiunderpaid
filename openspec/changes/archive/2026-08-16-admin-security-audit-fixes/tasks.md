# Tasks: Admin Security Audit Fixes

- [ ] **Task 1: Secure Algolia Endpoints Authentication**
  - Add `await verifyAdmin(event)` to `server/api/admin/clear-algolia.post.ts`
  - Add `await verifyAdmin(event)` to `server/api/admin/configure-algolia.post.ts`

- [ ] **Task 2: Register Secrets in Nuxt Config**
  - Ensure `algoliaAdminKey` is defined in `nuxt.config.ts` under `runtimeConfig` to support secure server-side retrieval.

- [ ] **Task 3: Refactor Credentials & Opaque Errors (Algolia)**
  - In `clear-algolia.post.ts` and `configure-algolia.post.ts`, replace `process.env.ALGOLIA_ADMIN_KEY` with `config.algoliaAdminKey`.
  - Update `createError` messages to be generic (e.g., "Failed to configure search index" instead of raw `error.message`).

- [ ] **Task 4: Refactor Credentials & Opaque Errors (Adzuna Locations)**
  - In `server/api/admin/adzuna-locations.get.ts`, replace `process.env.adzunaAppId` with `config.adzunaAppId` and `config.adzunaAppKey`.
  - Update `createError` to return a 503 opaque message ("Market data temporarily unavailable") instead of leaking the provider and country.

- [ ] **Task 5: Verification**
  - Run `pnpm nuxi typecheck`
  - Run `pnpm vitest run` to ensure no build breaks or coverage drops.
