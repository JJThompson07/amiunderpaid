## Why

BenchmarkMyRole becomes a paid B2B API: role + location in, MCA score, salary markers, government data and geo-economics out. The engine (`server-side-mca-engine`), occupation × region data and economics (`uk-geo-economics-ingestion`) and live percentiles (`reed-percentiles-and-geo-cascade`) now exist server-side. What's missing is the product around them:

- a public, versioned API on its own host
- self-serve developer accounts and API keys
- per-key rate limits and monthly quotas that hold across serverless instances
- usage-based billing

Today none of this exists. The only rate limiter is in-memory and per-instance (`server/middleware/rate-limit.ts`, a known gap in the `rate-limiting` spec). The app has no self-serve sign-up: recruiters are provisioned by admins. Stripe is used only for flat territory subscriptions; test mode has 0 billing meters, though `billing.meters.list` works on the pinned API version `2026-03-25.dahlia` (verified 2026-11-10).

## What Changes

- **New host `api.benchmarkmyrole.com`**, attached to the existing Vercel project. Edge routes from `shared/utils/hostRouting.ts`:
  - `/v1/**` rewrites to Nitro `/api/v1/**`, and `/openapi.json` serves the spec. Every other path on the API host returns a JSON 404.
  - `/api/v1/**` requested on any other host returns 404, so the API answers only on its own host.
  - On `www.benchmarkmyrole.com`, the clean portal paths (`/docs`, `/pricing`, `/playground`, `/dashboard`, `/login`, `/signup`) rewrite to `/developers/*`.
- **New v1 endpoints** (UK only at launch; JSON envelope, request id, rate-limit headers):
  - `GET /v1/benchmark`: role (`soc` or free-text `role`) + `location` (place or postcode) + optional `salary`, `strict`, `student_loan`, `tax_region`. Returns resolution, national/regional percentiles with `basis`, regional modifier, MCA score (when `salary` is given), **take-home pay** (when `salary` is given), and geo-economics context.
  - `GET /v1/roles/search?q=`: ranked SOC candidates.
  - `GET /v1/geo/{location}/economics`: `getGeoEconomics`.
  - Live (Reed-derived) data is **omitted** unless the server flag `apiLiveDataEnabled` is true. It defaults to false until the Reed licence is confirmed.
- **API keys:** `bmr_live_` + 32 random bytes (base62).
  - Shown once. Stored only as an HMAC-SHA256 (with a server-side pepper) used as the `api_keys` doc id, so lookup is a single read.
  - Up to 5 active keys per account; revocation is immediate.
- **Accounts and plans:**
  - Self-serve email/password sign-up on the developer portal, with email verification required before key creation.
  - Plan state lives in a server-only `api_accounts/{uid}` collection.
  - Plans: `free` (no card, hard monthly cap), plus two paid plans with included calls and **Stripe Billing Meter** overage. Plan quotas and Stripe price lookup keys are config. **Prices and quotas are not decided yet**; task 1.1 is the user's decision.
- **Metering:**
  - Every **2xx** counts as one billable request; 4xx, 5xx and 429 are free.
  - Counters live in **Upstash Redis via the Vercel Marketplace**, with a durable Firestore fallback if Redis is unreachable.
  - An hourly cron reports per-account usage deltas to Stripe meter events with idempotent identifiers.
- **Rate limiting:** a per-key requests-per-second window in Redis. If Redis is down, an in-memory per-instance limiter applies (fail-open, logged).
- **Portal** (`developer` layout from `site-separation`): landing, pricing, docs (rendered from `public/benchmarkmyrole-openapi.json`), sign-up/login, dashboard (keys, usage, plan, upgrade via Checkout, manage via Billing Portal), and a playground that calls the API through a server proxy, so keys never sit in the browser.
- **Stripe webhook:** handles API checkout/subscription events (`metadata.product = 'bmr_api'`) in their own branch. Territory branches are untouched.
- **Shared take-home pay:** a `shared/utils/takeHomePay.ts` table for income tax (rUK and Scottish bands), employee NI and student loans (plans 1, 2, 4, 5 and postgraduate), versioned by tax year with gov.uk source links. `amiunderpaid-seo-funnel` reuses it.
- **Suggestions:** fuzzy resolutions from API calls are recorded in `job_suggestions` with `source: 'api'`, feeding the existing admin approval flow.

## Scope

API host routing, the three v1 endpoints, keys, accounts, plans, metering, rate limiting, billing integration, the developer portal, take-home pay, and OpenAPI docs.

## Non-goals

- Organisations or teams (single-user accounts in v1), and an MCP server (deferred).
- USA data through the API. The engine supports it, but v1 is UK-only.
- Removing the recruiter portal: `recruiter-deprecation-and-regional-explorer`. This change leaves `/recruiter/**`, `/auth/**` and `/api/**` allowlisted on `www.benchmarkmyrole.com`.
- Enabling live Reed data for API keys. That's a flag flip after the licence check, not a code change.
- Setting prices (a user decision, task 1.1).

## Capabilities

### New Capabilities

- `public-api`: the v1 endpoints, envelope, errors, versioning, UK-only scope and live-data flag.
- `api-keys`: key format, issuance, hashing, lookup, limits and revocation.
- `api-metering-billing`: billable unit, counters, quotas, rate limits, Stripe meter reporting, plans and webhook handling.
- `developer-portal`: sign-up, dashboard, docs, playground and pricing pages on `www.benchmarkmyrole.com`.
- `take-home-pay`: the UK tax/NI/student-loan calculation.

### Modified Capabilities

- `site-host-routing` (from `site-separation`): adds the API host's rules, the `/api/v1/**` single-host rule, and the portal path rewrites.
- `rate-limiting`: the "Limiter consistency across serverless instances" requirement is satisfied for API traffic by the shared Redis store.

## Impact

- **New dependency:** `@upstash/redis`. It's HTTP-based, works from serverless functions without connection pooling, and is the client for the Marketplace-provisioned store. The alternative, Firestore counters, would put a transaction on every API request's latency path and hit per-document write limits under bursty traffic.
- **New:**
  - Server routes: `server/api/v1/**`, `server/api/developer/**`, `server/api/cron/report-usage.get.ts`
  - Server utils: `server/utils/api/{keys,auth,envelope,metering,rateLimit,redis,plans}.ts`
  - `shared/utils/takeHomePay.ts`
  - Pages: `app/pages/developers/{index,pricing,docs,playground,dashboard,login,signup}.vue`
  - `public/benchmarkmyrole-openapi.json`
  - `scripts/stripe-setup-api-billing.ts`
  - i18n `developers.json`, extended in both locales
  - tests for all of the above
- **Modified:** `shared/utils/hostRouting.ts` (+ tests), `server/api/stripe/webhook.post.ts` (+ tests), `nuxt.config.ts` (runtimeConfig), `vercel.json` (one hourly cron), `firestore.rules` (+ rules tests).
- **Infra:** a new Vercel domain `api.benchmarkmyrole.com` (DNS), a Marketplace Upstash Redis store, and Stripe products/prices/meter created by script in test mode, then live mode on the user's go-ahead.
