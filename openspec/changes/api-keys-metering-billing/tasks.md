## 1. Pre-flight (decisions and real infrastructure state)

- [ ] 1.1 **User decision:** for `starter` and `pro`, the monthly price, included requests, overage price per 1,000 requests and requests/second; for `free`, included requests and requests/second. Record them in design.md D4. Implementation of `plans.ts` waits on this.
- [ ] 1.2 Confirm `site-separation`, `server-side-mca-engine`, `uk-geo-economics-ingestion` and `reed-percentiles-and-geo-cascade` are merged: `shared/utils/hostRouting.ts`, `server/utils/engine/`, `server/utils/economics.ts` and `server/utils/liveCascade.ts` exist.
- [ ] 1.3 Stripe, test mode, run read-only:
  - Confirm `billing.meterEvents.create` accepts `identifier` and rejects a duplicate on the pinned `2026-03-25.dahlia` version, using a throwaway meter that's deactivated afterwards.
  - Confirm `billing_portal.configurations.list` returns a usable default.
  - Record both results in design.md D5/D6.
- [ ] 1.4 Verify every 2026-27 rate the `takeHomePay` table needs on gov.uk and record each source URL:
  - rUK and Scottish income tax bands and rates
  - personal allowance and taper
  - employee Class 1 NI thresholds and rates
  - student loan plan 1/2/4/5/postgraduate thresholds and rates

  Don't write any rate from memory.

- [ ] 1.5 Ask the user to provision **Upstash Redis via the Vercel Marketplace** on project `prj_PgKmh9wzUPm96dEfkN6mF8Dvpvog`, for the Production and Preview environments. Then list the injected env var **names** (`vercel env ls`) and register exactly those names in `runtimeConfig`.
- [ ] 1.6 Inspect the live-mode Stripe webhook endpoints (the user does this in the Dashboard, or runs a read-only listing): note each endpoint's URL host and enabled events. If `customer.subscription.updated` isn't enabled on the endpoint the app uses, list it as a task 6.1 dashboard step for the user.
- [ ] 1.7 Build locally with `NITRO_PRESET=vercel` after task 2.1. Inspect `.vercel/output/config.json` to confirm the API-host rewrites land ahead of Nitro's catch-all, and that `/api/v1/not-found` is reachable as a rewrite destination.

## 2. Host routing

- [ ] 2.1 `shared/utils/hostRouting.ts`: add the `api.benchmarkmyrole.com` rules, the other-host `/api/v1/**` → not-found rule, and the BMR portal clean-path rewrites + `/developers/*` 301, per design D1, ahead of the BMR catch-all. Add `api.localhost:3000` to `DEV_HOSTS`. Extend `shared/utils/tests/hostRouting.spec.ts` with every scenario in `specs/site-host-routing` and `specs/developer-portal`, plus the compiled-route equivalence test.
- [ ] 2.2 `server/api/v1/not-found.ts`: JSON 404 envelope with a docs link (+ test).

## 3. API core utilities (code + tests together)

- [ ] 3.1 Register private runtime config in `nuxt.config.ts`:
  - Secrets: `apiKeyPepper` and the Redis names from 1.5.
  - Non-secret server values: `apiLiveDataEnabled` (default false), `apiCheckoutEnabled` (default false) and `apiVersion`.
- [ ] 3.2 `pnpm add @upstash/redis`. `server/utils/api/redis.ts` provides a lazy client from runtimeConfig, with a test using a mocked client.
- [ ] 3.3 `server/utils/api/keys.ts`: `generateKey`, `hashKey` (HMAC-SHA256 with the pepper), `createKey(uid, name)` (transaction: verified email, ≤5 active), `revokeKey` (idempotent: no-op if already revoked, count clamped at 0, evicts the hash from the local positive cache), `listKeys`, and the lookup with 60s positive / 10s negative caches, each capped at 5,000 entries with expired-sweep then FIFO eviction per design D2.
  - Tests: format and entropy length, a hash that's stable and pepper-dependent, the limit, revocation (including a duplicate revoke leaving the count unchanged and an immediate local 401 after revoke), the cache TTLs, both caches staying at their cap under a flood of distinct invalid keys, and that the raw key never appears in any Firestore write.
- [ ] 3.4 `server/utils/api/plans.ts`: `PLANS` from task 1.1 and `getAccount(uid)` with a 60s cache (+ tests).
- [ ] 3.5 `server/utils/api/rateLimit.ts`: Redis per-second window, in-memory fallback on error (+ tests: under, over, Redis error).
- [ ] 3.6 `server/utils/api/metering.ts`: `checkQuota`, `recordBillable` (one pipeline: INCR month + hour, `SADD active:{H}`, each with `EXPIRE … NX` TTLs per design D2; Firestore `api_usage_fallback` increment on Redis error), `readUsage` (+ tests, including asserting every written key gets a TTL).
- [ ] 3.7 `server/utils/api/envelope.ts`: `ok(data, meta)`, `fail(code, status, details?)` and the request-id generator (+ tests: shape, and messages never contain provider names).
- [ ] 3.8 `server/utils/api/auth.ts`: `withApi(handler)` running pipeline steps 1–9 of design D2.
  - Tests: every 401 path, 429 rate and quota, free vs paid quota behaviour, the safety ceiling (alert sent), only 2xx metered, headers set, and the raw key never passed to `console.*`.
- [ ] 3.9 `shared/utils/takeHomePay.ts` per design D8 with the task 1.4 table.
  - Tests: `shared/utils/tests/takeHomePay.spec.ts`. Cover personal allowance boundaries, the taper (£100k–£125,140 range), each rUK and Scottish band edge, NI thresholds, each student loan plan, combined plans and zero/negative input.
- [ ] 3.10 Extract the suggestion upsert from `server/api/market-data/update-match.post.ts` into `server/utils/suggestions.ts` `recordSuggestion({ term, code, title, country, source })` and use it there (+ tests).

## 4. v1 endpoints

- [ ] 4.1 `server/api/v1/benchmark.get.ts`: validate input (400 `invalid_request`), resolve the location (422 `unsupported_country`), call `computeBenchmark` plus `getGeoEconomics` plus `calculateTakeHome` (when there's a salary). Apply strict mode (422 `role_unresolved`), strip `live` unless `apiLiveDataEnabled`, record fuzzy resolutions with `source: 'api'`, and fill `meta.sources`.
  - Tests: every scenario in `specs/public-api`, an engine 503 → `service_unavailable`, and `live` absent when the flag is off.
- [ ] 4.2 `server/api/v1/roles/search.get.ts`: ≤10 candidates (+ tests).
- [ ] 4.3 `server/api/v1/geo/[location]/economics.get.ts` (+ tests, including 404).
- [ ] 4.4 `public/benchmarkmyrole-openapi.json`: OpenAPI 3.1 for the three endpoints, the envelope, errors, auth scheme, rate-limit headers and examples. Add a unit test that every route in `server/api/v1/` (except not-found) appears in the document.

## 5. Accounts and developer endpoints

- [ ] 5.1 `server/api/developer/account.post.ts`: verify the ID token and create `api_accounts/{uid}` if absent (+ tests).
- [ ] 5.2 `server/api/developer/keys.get.ts`, `keys.post.ts` and `keys/[id].delete.ts`, with token-verified ownership checks (+ tests, including another user's key → 404).
- [ ] 5.3 `server/api/developer/usage.get.ts`: current month and plan (+ tests).
- [ ] 5.4 `server/api/developer/playground.post.ts`: token-verified, verified email only; runs the v1 handler logic in-process as the account and is metered (+ tests).
- [ ] 5.5 Add `account.post`, `keys.post` and `playground.post` to Redis-backed per-IP limits through `rateLimit.ts` at 5/min, 10/min and 30/min (+ tests).
- [ ] 5.6 `firestore.rules`: `api_keys`, `api_accounts` and `api_usage_fallback` server-only. Add rules tests to the existing suite.

## 6. Stripe

- [ ] 6.1 `scripts/stripe-setup-api-billing.ts`: idempotently create the meter, products and prices (base + tiered metered with the first N at 0) by lookup key, for whichever mode the key is in, and print the created ids. Run it in **test** mode and record the output in the PR.
- [ ] 6.2 `server/api/developer/checkout.post.ts`: gated by `apiCheckoutEnabled` (403 if false). Subscription Checkout with lookup-key prices, `metadata` and `subscription_data.metadata` = `{ product: 'bmr_api', uid, plan }`, reusing or creating the customer (+ tests).
- [ ] 6.3 `server/api/developer/billing-portal.post.ts` (+ tests).
- [ ] 6.4 `server/api/stripe/webhook.post.ts`: an API branch first for `checkout.session.completed` / `customer.subscription.updated` / `customer.subscription.deleted` with `product === 'bmr_api'`, inside the existing dedup.
  - Tests: each event, territory events don't touch `api_accounts`, API events don't touch territory collections, and duplicate events are ignored.
- [ ] 6.5 `server/api/cron/report-usage.get.ts` per design D5: `CRON_SECRET` via `verifyCronSecret` (from `uk-geo-economics-ingestion`), `SMEMBERS active:{H}` + `MGET` plus Firestore fallback merge (no `SCAN`), meter events with identifiers, fallback docs deleted only after a successful report, 24h catch-up, per-account failure isolation, failure-only email.
  - Tests: one hour reported, a duplicate run, a failed account retried next run (its fallback doc kept), free accounts skipped, the fallback merged then deleted.
- [ ] 6.6 `vercel.json`: `{ "path": "/api/cron/report-usage", "schedule": "5 * * * *" }`.

## 7. Developer portal UI

- [ ] 7.1 Extend i18n `developers.json` (en-GB and en-US) with landing, pricing, docs, sign-up/login, dashboard, playground, errors and email-verification copy (§6, no hardcoded strings).
- [ ] 7.2 `app/pages/developers/signup.vue` and `login.vue`: Firebase email/password, `sendEmailVerification`, then `POST /api/developer/account`. Use `useCurrentUser()` for reactivity (Golden Rule) and `useFirebaseAuth()` only for SDK calls.
- [ ] 7.2a `app/middleware/developer.ts` (named route middleware, applied to `dashboard.vue` and `playground.vue`): `await getCurrentUser()` (same pattern as `app/middleware/recruiters.ts`, not `useCurrentUser()`, which is `undefined` before auth hydrates) and, if signed out, `navigateTo` the developer login with `redirect` set to the requested path. Redirected `/recruiter/*` visitors (from `recruiter-deprecation-and-regional-explorer`) land here. Covered by the 7.8 e2e: signed-out `/dashboard` → login.
- [ ] 7.3 `app/pages/developers/dashboard.vue`: keys list/create (show-once modal `ModalApiKeyCreated.vue`)/revoke, usage meter, plan card, upgrade (hidden when checkout is disabled) and billing portal button. Toasts via `useSystemToast`.
- [ ] 7.4 `app/pages/developers/docs.vue`, with renderer component `app/components/Developer/OpenApiOperation.vue`. If it carries real logic (parameter/schema flattening), add `app/components/Developer/tests/OpenApiOperation.spec.ts` (§8).
- [ ] 7.5 `app/pages/developers/playground.vue`: form for the 3 endpoints, JSON viewer, verify-email gate.
- [ ] 7.6 `app/pages/developers/pricing.vue`: driven by a public, non-secret plan summary from `GET /api/developer/plans` (+ test). Update `app/pages/developers/index.vue` (from `site-separation`) from "coming soon" to the launch landing.
- [ ] 7.7 New composable `app/composables/useDeveloperAccount.ts` (token fetch + developer endpoints) with `app/composables/tests/useDeveloperAccount.spec.ts`.
- [ ] 7.8 e2e: `e2e/developer-portal.spec.ts` with **mocked** developer endpoints and Firebase (no live calls, §10). Decline the cookie banner and block GA/GTM. Cover sign-up → dashboard → create key (shown once) → revoke.

## 8. Rollout

- [ ] 8.1 Preview: deploy and exercise sign-up, key creation, a v1 call via the preview URL's `/api/v1/*` (preview hosts aren't host-routed; confirm), a test-card upgrade, the webhook, the next hourly report in the Stripe test meter, and a downgrade.
- [ ] 8.2 Ask the user to add `api.benchmarkmyrole.com` to the Vercel project and DNS. Verify TLS and `curl https://api.benchmarkmyrole.com/openapi.json`.
- [ ] 8.3 Production with `apiCheckoutEnabled=false`. Smoke-test from a curl script:
  - a v1 call with a real free key → 200 with headers
  - a bad key → 401
  - an amiunderpaid `/api/v1/benchmark` → 404
  - BMR `/dashboard` served
  - BMR `/developers/docs` → 301 `/docs`
- [ ] 8.4 On the user's explicit go-ahead only: run the setup script in **live** mode, set `apiCheckoutEnabled=true`, and verify one real upgrade and cancellation with the user's own card. This is reversible by refund.
- [ ] 8.5 Propose a CODE_STANDARDS.md addition (and mirror it in `openspec/config.yaml` context), worded for the user's approval:
  - "Public API handlers under `server/api/v1/` MUST be wrapped in `withApi`."
  - "API keys and the Authorization header MUST never be logged or persisted unhashed."

## 9. Verification

- [ ] 9.1 Gate: `pnpm test:verify` passes, with 80% per-file coverage on every new `server/utils/api/*.ts`, `server/api/v1/**`, `server/api/developer/**`, the cron, `takeHomePay.ts` and `useDeveloperAccount.ts`; e2e green with mocks; rules tests green.
