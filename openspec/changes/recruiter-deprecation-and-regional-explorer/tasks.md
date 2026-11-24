## 1. Pre-flight (verify real state before removing anything)

- [ ] 1.1 **Stripe live mode** (the user runs this in the Dashboard, or with a read-only live key): count active/trialing/past_due subscriptions on territory prices. If there are any, **stop** and ask the user how to handle them. Record the count (expected 0).
- [ ] 1.2 List the live webhook endpoints' URL hosts. That decides whether `/api/stripe/webhook` stays on the benchmarkmyrole allowlist (design D3).
- [ ] 1.3 Firebase Console → Authentication → Templates: record the email action URL. That decides whether `/auth/**` stays on the benchmarkmyrole allowlist.
- [ ] 1.4 Re-count in production Firestore: `territory_category_owners`, `leads`, `recruiter_contact_settings`, and users with `role == 'recruiter'`. **User decision:** notify the recruiter-role accounts (3 as of 2026-11-10) that the portal is closing, or not.
- [ ] 1.5 **User decision:** reword the recruiter clauses in `i18n/locales/*/terms-and-conditions.json` (10 mentions in en-GB), or leave the legal text for now. Don't edit legal copy without an answer.
- [ ] 1.6 ONS Geoportal: confirm the current "Regions" and "Counties and Unitary Authorities" BUC GeoJSON dataset names and vintage. Then check that every UK Table 7.7a `id_code` in Firestore (all-roles records) either is a CTYUA code in that vintage or maps to one through `shared/data/uk-geo.json`. Record the unmapped count; if it's above 5%, revisit design D4 before building the explorer.
- [ ] 1.7 Confirm `api-keys-metering-billing` is merged (the webhook's API branch and `/dashboard` exist), since the redirects target `/dashboard`.

## 2. Results pages and navigation (stop rendering recruiter UI)

- [ ] 2.1 `app/pages/salary/[title]/[country]/[[location]].vue` and `app/pages/jobs/[title]/[country]/[[location]].vue`: remove the "Take action" recruiter grid, `AmIRecruiterButton`, `AmICardLeadContact`, `AmILeadFloatingButton`, `useRecruiterCards` and `hasRecruiters`.
- [ ] 2.2 `app/composables/useAffiliateOfferToast.ts`: drop the `hasRecruiters` option. Update `app/composables/tests/useAffiliateOfferToast.spec.ts` and callers.
- [ ] 2.3 `app/composables/useJobSearchEngine.ts`: remove the recruiter-card comment block, which describes integration that no longer exists.
- [ ] 2.4 `app/components/AmI/NavBar.vue`: remove `recruiterLinks`, the `isRecruiter` branches and the admin `recruiters`/`banding` links. Remove the matching `navbar.*` i18n keys from both locales.
- [ ] 2.5 Rename `app/composables/useRecruiterAuth.ts` → `app/composables/useAuth.ts` (export `useAuth`). Logout navigates to `/`. Update `app/components/Modal/ForgotPassword.vue`, `app/components/Toast/EmailVerification.vue` and the developer portal pages from `api-keys-metering-billing`, and rename the spec to `app/composables/tests/useAuth.spec.ts`.
- [ ] 2.6 `app/pages/auth/reset-password.vue`: the success action goes to `/` (amiunderpaid) or `/login` (benchmarkmyrole, by `$siteBrand`; non-ISR route). Replace the `account.reset-password.success.action.recruiter` key in both locales.
- [ ] 2.7 `app/composables/useUserRole.ts`: drop `isRecruiter`, and update `app/composables/tests/useUserRole.spec.ts` and `app/layouts/default.vue` usages.

## 3. Routing, then deletion (exhaustive list from `grep -rliE "recruiter|territor|leads?"`, 2026-11-12)

- [ ] 3.1 `shared/utils/hostRouting.ts`: add the design D2 recruiter redirects first, narrow the benchmarkmyrole allowlist per design D3 (using 1.2/1.3), add the `/explorer` `.com` → `.co.uk` rule and the `/admin/{recruiters,banding}` → `/admin` courtesy redirects, and remove the `// TEMPORARY` comments. Extend `shared/utils/tests/hostRouting.spec.ts` with every new spec scenario plus the compiled-route equivalence test.
- [ ] 3.2 Delete pages and layout:
  - `app/pages/recruiter/{dashboard,leads,login,onboarding,profile}.vue`
  - `app/pages/recruiter/territories/{index,edit}.vue`
  - `app/pages/recruiter/.DS_Store`
  - `app/pages/admin/{recruiters,banding}.vue`
  - `app/layouts/loginLayout.vue`
- [ ] 3.3 Delete components:
  - `app/components/Territory/{DashboardMatrix,List,Map,NonContiguousRegions,ScheduleMatrix}.vue`
  - `app/components/Modal/{CancelTerritory,RequestAccess}.vue`
  - `app/components/Toast/NationalConfirmation.vue` (+ `Toast/tests/NationalConfirmation.spec.ts`)
  - `app/components/AmI/RecruiterButton.vue` (+ `AmI/tests/RecruiterButton.spec.ts`)
  - `app/components/AmI/LeadFloatingButton.vue`
  - `app/components/AmI/Card/LeadContact.vue`
- [ ] 3.4 Delete composables and their specs:
  - `app/composables/{useRecruiterCards,useTerritories,useTerritoryClaims,useScheduleMath,usePricing,useContactSettings}.ts`
  - `app/composables/tests/{useRecruiterCards,useTerritories,useTerritoryClaims,useScheduleMath,usePricing}.spec.ts` (and the `useContactSettings` spec if present)
- [ ] 3.5 Delete middleware: `app/middleware/{recruiters,recruiter-verified}.ts`.
- [ ] 3.6 Delete server routes and their specs:
  - `server/api/admin/recruiters/{accept,discount,index.get,reject,set-national}.ts` + `tests/*`
  - `server/api/user/leads/submit.post.ts` + `tests/submit.spec.ts`
  - `server/api/user/recruiter/{contact-settings,request-access}.post.ts` + `tests/*`
  - `server/api/user/search/recruiter-card.get.ts` + `tests/recruiter-card.spec.ts`
  - `server/api/stripe/{create-checkout,cancel-territory}.post.ts` + `tests/{create-checkout,cancel-territory}.spec.ts`
- [ ] 3.7 Delete server utilities: `server/utils/{territoryFulfillment,billingAlerts}.ts` + `server/utils/tests/territoryFulfillment.spec.ts` (and the `billingAlerts` spec if present). Grep first that nothing else imports `billingAlerts`.
- [ ] 3.8 `server/api/stripe/webhook.post.ts`: remove the territory `checkout.session.completed` and `customer.subscription.deleted` branches. Keep signature verification, `stripe_events` dedup and the API branch. Rewrite `server/api/stripe/tests/webhook.spec.ts` for the remaining behaviour, including the modified dedup scenarios.
- [ ] 3.9 Delete `scripts/migrate-territory-claims.ts`, `utils/bands/{uk,usa}.ts` and `utils/tests/bands-{uk,usa}.spec.ts`.
  - Remove the `Territory`/`USATerritory` types and `RECRUITER_TERRITORIES_{UK,USA}` from `utils/locations/{uk,usa}.ts`, keeping `ONS_LOCATIONS` and the US location tables.
  - Update `utils/tests/locations-{uk,usa}.spec.ts`.
  - Remove `TerritoryClaim`/`NationalStatus` from `shared/utils/types.ts` if unused.
- [ ] 3.10 `server/middleware/rate-limit.ts`: remove the `/api/user/leads/submit` and `/api/user/recruiter/request-access` entries, and update `server/middleware/tests/rate-limit.spec.ts` to the new spec scenario (`/api/user/suggestion`).
- [ ] 3.11 `server/routes/robots.txt.ts`: drop `Disallow: /recruiter/` (it now redirects), and update `server/routes/tests/robots.txt.spec.ts`.
- [ ] 3.12 i18n: delete `i18n/locales/{en-GB,en-US}/recruiter.json` and remove its import from both `index.ts`. Remove recruiter keys from `account.json`, `faq.json`, `login.json`, `navbar.json` and `sections.json`, plus `terms-and-conditions.json` per 1.5. Run `scripts/check-i18n.ts` (in `pnpm lint`) to catch orphans.
- [ ] 3.13 e2e: delete `e2e/{recruiter-dashboard,recruiter-profile,recruiter-territories,checkout,login}.spec.ts`. Update `e2e/{job-search,affiliate-toast}.spec.ts` to drop recruiter-card mocks and assertions.
- [ ] 3.14 Re-run `grep -rliE "recruiter|territor|leadcontact|useScheduleMath|usePricing" app server shared utils e2e scripts`. The only remaining hits should be generic words (`searchRelevance.ts`'s `'recruiter'` job-title token, "territorial", the `affiliates.ts` comment). Explain any other hit or remove it.
- [ ] 3.15 `server/utils/emailTemplate.ts` stays (generic and tested). Confirm `pnpm test:coverage` doesn't flag it. If `resolveBrandFromHost` now has no caller, delete just that function and its tests.

## 4. Data access and rules

- [ ] 4.1 `firestore.rules`: `territory_category_owners`, `leads` and `recruiter_contact_settings` become `allow read, write: if false`. Leave the `users` denylist as it is (stored fields still exist). Update the rules test suite for the new "Retired recruiter collections are server-only" requirement.
- [ ] 4.2 Grep `server/` and `app/` for `.collection('territory_category_owners'|'leads'|'recruiter_contact_settings')`: expect zero hits.

## 5. Boundaries

- [ ] 5.1 `scripts/build-uk-boundaries.ts` per design D5 (with `pnpm dlx mapshaper`). Generate `public/geo/uk-regions-2025.json` and `public/geo/uk-ctyua-2025.json` with only `{ gss, name }` properties, under 400 KB each. Note the source URLs and OGL attribution in the script header.
- [ ] 5.2 Delete `public/uk-regions.json`. Grep that nothing references it.

## 6. Explorer

- [ ] 6.1 `server/utils/engine/baselines.ts`: export `getRegionalOccupationPay(soc, regionGss)` (the existing cascade) and `getAllRolesByArea()`. Tests in `server/utils/engine/tests/baselines.spec.ts`.
- [ ] 6.2 `server/api/explorer/regions.get.ts` per design D4: `defineCachedEventHandler`, 24h, `soc` validated (`^\d{4}$`) with an opaque 400.
  - Tests: `server/api/explorer/tests/regions.get.spec.ts`, covering with SOC, without, malformed, and NI no-data.
- [ ] 6.3 `app/components/Explorer/Map.vue`: ECharts map registration per mode, GSS join, `generateColorScale` legend, estimated hatch, NI no-data styling, and `onBeforeUnmount` dispose.
- [ ] 6.4 `app/components/Explorer/ApiSample.vue`: an illustrative JSON built from the endpoint data (no API call) and the "Try it live" link.
- [ ] 6.5 `app/pages/explorer.vue`: role picker via `useJobAutocomplete`, `soc` in the query, title/description/canonical (`.co.uk`) through `useSeoMeta`, and no host-derived output (CODE_STANDARDS rule from `site-separation`).
- [ ] 6.6 `nuxt.config.ts` route rules: `'/explorer': { swr: 86400, isr: { allowQuery: ['soc'] } }`. Verify in a `NITRO_PRESET=vercel` build that `.vercel/output` emits the ISR function with `allowQuery: ['soc']`.
- [ ] 6.7 i18n `explorer.json` (en-GB and en-US), registered in both `index.ts`.
- [ ] 6.8 `server/routes/sitemap.xml.ts`: add `/explorer` to the `.co.uk` sitemap only (+ test).
- [ ] 6.9 e2e: `e2e/explorer.spec.ts` with a **mocked** `/api/explorer/regions`, cookie banner declined and GA/GTM blocked. Cover: select a role → URL has `soc` → map legend shows "estimated" → the "Try it live" link points to the playground.

## 7. Verification

- [ ] 7.1 Production smoke after deploy (curl): the recruiter URLs on all three hosts redirect per design D2; `.com/explorer?soc=2134` → 301 `.co.uk`; `www.benchmarkmyrole.com/api/market-data/jobs` redirects; `/api/developer/usage` is still served on benchmarkmyrole; the explorer renders.
- [ ] 7.2 Stripe: send a test-mode webhook for an API subscription event and confirm 200 and the expected `api_accounts` change.
- [ ] 7.3 Record the burn-in start date in project memory, and propose the follow-up change `recruiter-data-retirement` (export, then delete the retired collections, the recruiter users' fields and Auth accounts, and the Stripe territory products) for at least 30 days later.
- [ ] 7.4 Gate: `pnpm test:verify` passes (lint incl. i18n check, typecheck, 80% per-file coverage, e2e with mocks, rules tests).
