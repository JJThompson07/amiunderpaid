## 1. Algolia & Math Fixes
- [ ] 1.1 In `app/composables/useMicroData.ts`, append the occupation code to `baseRegionalFilter` in the UK branch, and reduce `hitsPerPage` from 1000 to the number of regions.
- [ ] 1.2 Update the associated test in `useMicroData.spec.ts` to assert the correct filter `'country:UK AND id_code:2136'`.
- [ ] 1.3 In `server/api/stripe/create-checkout.post.ts`, apply `Math.round(monthlyTotal * 100)` to ensure Stripe unit amounts are always integers.
- [ ] 1.4 In `app/pages/admin/seed.vue`, fix the seed year range array generation to correctly exclude future years.

## 2. Nuxt & Vue Correctness
- [ ] 2.1 Remove the `nuxt-i18n` import from `i18n.config.ts`.
- [ ] 2.2 Systematically search `server/` and replace `return createError` with `throw createError` so status codes propagate correctly (e.g., 401s don't appear as 200s).
- [ ] 2.3 Add an ESLint `no-restricted-syntax` rule to ban `return createError`.
- [ ] 2.4 In `app/pages/salary/...` and related components, replace `$t()` usage inside `<script setup>` blocks with the imported `t()` from `useI18n()`. Re-enable `no-undef` for Vue scripts in ESLint.

## 3. Tooling & CI
- [ ] 3.1 Run `pnpm add -D dotenv @vitejs/plugin-vue` to explicitly declare them.
- [ ] 3.2 Pin `xlsx` by vendoring it or updating the lockfile to include an integrity hash.
- [ ] 3.3 Update `package.json` lint scripts to include `tsx scripts/check-standards.ts`.
- [ ] 3.4 Update `.github/workflows/ci.yml` to run the full `pnpm lint` chain.

## 4. Documentation
- [ ] 4.1 Create an `.env.example` file populated with all necessary runtimeConfig keys.
- [ ] 4.2 Update `DEV.md` to document Node 24, pnpm 9, `FIREBASE_SERVICE_ACCOUNT_BASE64`, and localhost multi-tenant domain setups.
- [ ] 4.3 Remove the dead `firebaseServiceAccount` key from `nuxt.config.ts`.
- [ ] 4.4 Add a `LICENSE` file and resolve any `TBD` tags in archived OpenSpec specs.
