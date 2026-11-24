## 1. Pre-flight verification (CODE_STANDARDS §10: infrastructure-dependent change)

- [ ] 1.1 Re-confirm the production baseline the change relies on. Record the curl output in the PR description:
  - `curl -sI https://www.benchmarkmyrole.com/benchmark/lead-software-engineer/uk` returns a 301 to `/salary/...`.
  - `curl -sI https://www.amiunderpaid.co.uk/salary/software-engineer/usa` returns a 200.
  - `curl -s https://www.amiunderpaid.co.uk/salary/software-engineer/uk | grep canonical` shows the `.com` canonical.
  - If any of these has changed, stop and re-plan.
- [ ] 1.2 Prove Build Output routing works before writing the rule table:
  - Add one throwaway host-conditioned route to `nitro.vercel.config.routes` in `nuxt.config.ts`.
  - Run `NITRO_PRESET=vercel pnpm build` and confirm the route appears in `.vercel/output/config.json` **before** the `-isr` routes, with `has: [{ type: 'host', ... }]` intact.
  - Revert the throwaway route. If Nitro reorders or drops it, stop and revisit design D1.
- [ ] 1.3 Check which host any **live-mode** Stripe webhook endpoint is registered on (Stripe Dashboard → Developers → Webhooks, live mode; test mode has none). Record the result in the PR description. If it's on `www.benchmarkmyrole.com`, confirm `/api/**` stays in the benchmarkmyrole allowlist; it does by design D4.
- [ ] 1.4 Optional, non-blocking: pull GA `G-EZQYZSSRW1` sessions by hostname for the last 90 days and note benchmarkmyrole's share in the PR. `search_history.brand` undercounts it, because ISR renders log `amiunderpaid`.

## 2. Host-routing rule table (`shared/utils/hostRouting.ts`)

- [ ] 2.1 Create `shared/utils/hostRouting.ts` with:
  - `PRODUCTION_HOSTS`, `DEV_HOSTS` and `BMR_ALLOWLIST`
  - a single `REDIRECT_STATUS` constant, initially `302` (design Risks; flipped in 6.5)
  - `resolveHostRoute(host, path, query)` implementing every rule in `specs/site-host-routing/spec.md`, with one-hop targets and a case-insensitive country segment
  - `toVercelRoutes(hosts)` compiling the table into Build Output route objects

  No imports beyond types; `nuxt.config.ts` loads it via jiti.

- [ ] 2.2 In the same step, create `shared/utils/tests/hostRouting.spec.ts`:
  - One test per spec scenario in `specs/site-host-routing/spec.md`, with expected locations exactly as written (status asserted via `REDIRECT_STATUS`).
  - Query-string preservation.
  - Apex hosts are not handled; they're redirected by Vercel before the app sees them.
  - `localhost:3000` / `127.0.0.1:3000` always `pass`.
  - Every `BMR_ALLOWLIST` entry passes on benchmarkmyrole.
  - **Equivalence:** for every scenario, evaluate `toVercelRoutes(PRODUCTION_HOSTS)` with an in-test first-match matcher (regex `src` + `has.host`) and assert it agrees with `resolveHostRoute`.

  Verify: `pnpm test:coverage` shows `shared/utils/hostRouting.ts` ≥80% on all four metrics.

## 3. Wire the table into production and dev

- [ ] 3.1 In `nuxt.config.ts`, set `nitro.vercel.config.routes` to `toVercelRoutes(PRODUCTION_HOSTS)`.
  - Remove `'www.benchmarkmyrole.com'` from both i18n locale `domains` lists, and `bmr.us.localhost:3000` from the dev list.
  - Remove the `'/benchmark/**'` route rule.
  - Verify: re-run the 1.2 build and confirm every generated route sits ahead of the `-isr` routes in `.vercel/output/config.json`.
- [ ] 3.2 Create `server/middleware/dev-host-routing.ts`: returns immediately unless `process.dev`; otherwise applies `resolveHostRoute(DEV_HOSTS…)` via `sendRedirect` or an internal rewrite.
  - In the same step, add `server/middleware/tests/dev-host-routing.spec.ts`, covering the `process.dev === false` no-op plus redirect, rewrite and pass, with ≥80% per file.
  - Verify by hand: `pnpm dev`, then `curl -sI http://bmr.localhost:3000/about` returns a redirect to the UK dev host.
- [ ] 3.3 Remove `bmr.us.localhost:3000` from `app/composables/useHostCountry.ts` `US_DOMAINS`, and update `app/composables/tests/useHostCountry.spec.ts` if it references it. Verify: `pnpm test` passes.

## 4. Remove consumer brand branching

Every file below keeps only its `amiunderpaid` branch. Enumerated from `grep -rl siteBrand app` (2026-11-11), minus the recruiter, auth and app-shell files that stay until the recruiter portal is removed: `app/app.vue`, `app/layouts/loginLayout.vue`, `app/pages/recruiter/login.vue`, `app/plugins/tenant.ts`, `app/composables/useAnalytics.ts`, `app/composables/useUserLogging.ts`.

- [ ] 4.1 Delete `app/pages/benchmark/[title]/[country]/[[location]].vue`, `app/components/Brand/Benchmark/Home.vue` and `app/components/Brand/Benchmark/Faq.vue`. Remove the `'benchmark'` mode from `app/components/BaseSearchForm.vue` (prop type, `initialCountry`, template branch, contract options) and from `app/composables/useLocationEngine.ts` (`mode` param and the mode-dependent redirect path). Update their tests (`app/composables/tests/useLocationEngine*.spec.ts` if present). Verify: `pnpm typecheck` passes.
- [ ] 4.2 `app/pages/index.vue`: render only `BrandAmIHome`. `app/pages/frequently-asked-questions.vue`: render only `BrandAmIFaq`. Verify: `pnpm typecheck`.
- [ ] 4.3 `app/components/AmI/LocationBreadcrumbs.vue` and `app/components/Section/NoData.vue`: hard-code `/salary`. `app/pages/jobs/[title]/[country]/[[location]].vue`: link to `/salary/...` and set `ogImage` to `/amiunderpaid-og.png`. Verify: `pnpm typecheck`.
- [ ] 4.4 `app/components/AmI/Card/Role.vue`: replace `card.role.${$siteBrand}.*` with `card.role.amiunderpaid.*` and drop the `benchmarkmyrole` branch (line ~181). Update `app/components/AmI/Card/tests/Role.spec.ts` so it no longer stubs a benchmarkmyrole brand. Verify: `pnpm test`.
- [ ] 4.5 `app/pages/about.vue`, `app/pages/how-it-works.vue`, `app/pages/mca-score.vue`, `app/pages/data-sources.vue`, `app/pages/privacy-policy.vue`: keep only the amiunderpaid copy and meta. Keep `privacy-policy.vue`'s amiunderpaid-only section unconditional. Verify: `pnpm typecheck`.
- [ ] 4.6 `app/pages/insights/industry-trends/index.vue` and `[industry].vue`, `app/pages/jobs/index.vue`, `app/pages/salary/[title]/[country]/[[location]].vue` and `app/components/Brand/AmI/Home.vue`: remove `$siteBrand` from SEO meta and `ogImage`. Verify: `pnpm typecheck`.
- [ ] 4.7 `app/middleware/domain-routing.global.ts`:
  - Delete rules 2–4 (now at the edge) and the benchmarkmyrole locale-cookie block.
  - Rewrite rule 1 so that when `to.params.country` is present, the locale comes from it (`uk` → `en-GB`, `usa` → `en-US`); otherwise from the host, as today (design D6).
  - Add `app/middleware/tests/domain-routing.spec.ts` covering both paths.
  - Verify: `pnpm test`.
- [ ] 4.8 `app/layouts/default.vue` (design D6):
  - Canonical base comes from the route `country` param when present.
  - Country-scoped routes emit no hreflang alternates.
  - Remove the benchmarkmyrole `getBaseUrl` branch and the logo/brand ternaries (line ~56). Keep the amiunderpaid logo and favicon literal.
  - Verify: `pnpm typecheck`; the behaviour is checked in 6.2.
- [ ] 4.9 Create `app/layouts/developer.vue` (benchmarkmyrole logo, `/benchmarkmyrole-favicon.ico`, `theme-benchmarkmyrole`, its own canonical `https://www.benchmarkmyrole.com/`) and `app/pages/developers/index.vue` (static "API coming soon" content plus a link to `https://www.amiunderpaid.co.uk`, `definePageMeta({ layout: 'developer' })`, no forms).
- [ ] 4.10 i18n for 4.9: add `i18n/locales/en-GB/developers.json` and `i18n/locales/en-US/developers.json`, and register them in each locale's `index.ts`. No hardcoded strings (CODE_STANDARDS §6). Verify: `pnpm lint` (includes spellcheck) passes.
- [ ] 4.11 `server/routes/sitemap.xml.ts`:
  - On benchmarkmyrole, emit only `https://www.benchmarkmyrole.com/`.
  - On amiunderpaid hosts, never emit `/benchmark` URLs; remove the `routePrefix` ternary.
  - Update `server/routes/tests/sitemap.xml.spec.ts`. Verify: `pnpm test:coverage` keeps the file ≥80%.
- [ ] 4.12 Remove the i18n keys only the deleted branches used:
  - Enumerate with `grep -rhoE "(about\.benchmark|card\.role\.benchmarkmyrole|search\.benchmark|benchmark\.)[a-z0-9._-]+" app` before and after 4.1–4.8.
  - Delete keys that no longer have a caller from both `i18n/locales/en-GB/*.json` and `en-US/*.json`.
  - Keep any key still referenced by `/recruiter/**` or emails.
  - Verify: `pnpm lint` passes and a re-run grep finds no reference to a deleted key.
- [ ] 4.13 Run `grep -rn "siteBrand" app | grep -v tests`. The only remaining hits must be the six retained files listed above this section.

## 5. Standards and docs (CLAUDE.md: keep CODE_STANDARDS.md honest)

- [ ] 5.1 Propose adding a CODE_STANDARDS.md §2 rule (a gap hit by this change): "On routes cached via `swr`/`isr`, never derive output from the request host (`useRequestURL`, `$siteBrand`, host-based locale). Derive it from route params, or decide it at the edge in `shared/utils/hostRouting.ts`." Reference this change and the 2026-11-11 canonical bug. Ask the user to approve the wording before committing.
- [ ] 5.2 Update the "dual-tenant" description in `CODE_STANDARDS.md` (line 3), `AGENTS.md` and the `openspec/config.yaml` `context:` block (line 7) together, per its maintainer note: amiunderpaid is the consumer UI, benchmarkmyrole is the developer/API site. Also update CODE_STANDARDS §4's `$siteBrand` multi-tenancy bullet to say it's only for the remaining recruiter surface.

## 6. Verification and rollout

- [ ] 6.1 Run `pnpm test:verify` locally and fix anything it surfaces (lint, typecheck, Prettier, structure-lint, check-standards, ESLint, `test:coverage` with per-file ≥80%, `test:e2e`, `test:rules`).
- [ ] 6.2 Deploy a Vercel preview and, against the preview URL, verify the host-independent behaviour (host rules can't be exercised on preview; see design Risks):
  - `/salary/software-engineer/uk` has `lang="en-GB"`, canonical `https://www.amiunderpaid.co.uk/salary/software-engineer/uk`, and no hreflang alternates.
  - `/salary/software-engineer/usa` has `lang="en-US"` and a `.com` canonical.
  - `/benchmark/...` no longer renders a page.
  - `/developers` renders the landing page.
- [ ] 6.3 **Pre-flight before production:** confirm `REDIRECT_STATUS === 302` in the built `.vercel/output/config.json`, and that the previous production deployment is available for instant rollback in Vercel. Then promote.
- [ ] 6.4 Run the production smoke suite immediately after promotion, using the curl commands for every scenario in `specs/site-host-routing/spec.md`. On any mismatch, use Vercel instant rollback and stop. Record the results in the PR.
- [ ] 6.5 After 48h without incident, change `REDIRECT_STATUS` to `301` in a follow-up commit. Re-run 2.2's tests, then redeploy and re-run 6.4.
- [ ] 6.6 Resubmit `https://www.amiunderpaid.co.uk/sitemap.xml`, `https://www.amiunderpaid.com/sitemap.xml` and `https://www.benchmarkmyrole.com/sitemap.xml` in Google Search Console. Note the date in the PR.
- [ ] 6.7 Final gate: run `pnpm test:verify`. It must pass before archiving.
