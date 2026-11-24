## Context

- After `site-separation`, `shared/utils/hostRouting.ts` is the single host-rule table, compiled into `nitro.vercel.config.routes` and mirrored in dev by a `process.dev` middleware. `www.benchmarkmyrole.com/` rewrites to `/developers`, which uses a `developer` layout.
- After the three data changes:
  - `computeBenchmark(event, input)` returns resolution, baselines with `basis`, a live block with `provider`, and the score.
  - `getGeoEconomics(location)` and `resolveUkLocation` exist.
- Stripe:
  - SDK 22.0.1 pinned to `2026-03-25.dahlia`. `server/api/stripe/webhook.post.ts` verifies signatures and dedupes via `stripe_events` with `t.create()`.
  - Only territory products exist today.
- Firestore rules are deny-by-default. `users/{uid}` lets owners write any field not on a denylist.
- Vercel Pro allows hourly crons. No Redis is provisioned yet.

## Goals / Non-Goals

**Goals:**

- A request is authenticated, rate-limited, metered and answered with one Firestore read (cached) and two Redis round-trips beyond the engine's own work.
- Billing is exactly-once per request, even with retries and cron overlap.
- A leaked database snapshot doesn't yield usable API keys.

**Non-Goals:**

- Sub-second exactness of the free-tier cap across instances. Small overshoot at the boundary is acceptable.

## Decisions

### D1. Host and path layout

| Host                      | Path                                                           | Result                                    |
| ------------------------- | -------------------------------------------------------------- | ----------------------------------------- |
| `api.benchmarkmyrole.com` | `/v1/(.*)`                                                     | rewrite → `/api/v1/$1`                    |
| `api.benchmarkmyrole.com` | `/openapi.json`                                                | rewrite → `/benchmarkmyrole-openapi.json` |
| `api.benchmarkmyrole.com` | anything else                                                  | rewrite → `/api/v1/not-found` (JSON 404)  |
| any other host            | `/api/v1/(.*)`                                                 | rewrite → `/api/v1/not-found`             |
| `www.benchmarkmyrole.com` | `/(docs\|pricing\|playground\|dashboard\|login\|signup)(/.*)?` | rewrite → `/developers/$1$2`              |
| `www.benchmarkmyrole.com` | `/developers/(.*)`                                             | 301 → `/$1`                               |

- These rules are added to the table and its exhaustive tests, including the compiled-route equivalence test, before the BMR catch-all redirect.
- The dev host map gains `api.localhost:3000`.
- The API host's `/` returns the JSON 404 (with a `docs` link field), not HTML.

### D2. Request pipeline

`server/utils/api/auth.ts` `withApi(handler)` wraps every v1 handler:

1. Generate `requestId` (`req_` + 16 hex) and set `X-Request-Id`.
2. Parse `Authorization: Bearer bmr_live_…`. If missing or malformed: 401 `invalid_api_key`.
3. Compute `hash = HMAC-SHA256(apiKeyPepper, key)` and read `api_keys/{hash}`, using a 60s in-memory positive cache and a 10s negative cache. Both caches are hard-capped (positive 5,000 entries, negative 5,000 entries): on insert, expired entries are swept and, if the cap is still reached, the oldest entry is evicted (FIFO via `map.keys().next()`). A flood of random invalid keys therefore costs bounded memory and only churns the negative cache. If not found or revoked: 401.
4. Read the plan from `api_accounts/{uid}` (cached 60s).
5. Rate limit: Redis `INCR rl:{keyHash}:{epochSecond}` + `EXPIRE 2`. Over `plan.rps`: 429 `rate_limited` with `Retry-After: 1`.
6. Quota (free plan only): Redis `GET usage:{uid}:{YYYY-MM}` ≥ `plan.monthlyIncluded`: 429 `quota_exceeded`. Paid plans aren't hard-capped, except for a safety ceiling of `plan.monthlyIncluded × 20`, which returns 429 `quota_exceeded` and emails support.
7. Run the handler.
8. On a 2xx, one pipelined Redis round-trip: `INCR usage:{uid}:{YYYY-MM}` + `EXPIRE … 5184000 NX` (60 days), `INCR usage:{uid}:{YYYY-MM-DDTHH}` + `EXPIRE … 172800 NX` (48h), and `SADD active:{YYYY-MM-DDTHH} {uid}` + `EXPIRE … 172800 NX`. This is the billable count. Every usage key has a TTL, and the hourly active-account set lets the reporting cron avoid `SCAN`.
9. Set `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-Quota-Remaining` (free plan), and wrap the response in the envelope.

Redis errors at steps 5 and 6 fail open: an in-memory per-instance limiter applies and a warning is logged. A Redis error at step 8 writes `FieldValue.increment(1)` to `api_usage_fallback/{uid}_{YYYY-MM-DDTHH}`, so billable usage is never lost.

### D3. Key format and storage

- **Format:** `bmr_live_` + base62(32 bytes from `crypto.randomBytes`). Displayed once at creation; afterwards only `bmr_live_…` + the last 4 characters.
- **`api_keys/{hmacHex}`:** `{ uid, name, last4, createdAt, revokedAt: null, lastUsedAt }`. `lastUsedAt` is written at most once an hour per key, using the in-memory cache's timestamp to throttle.
- **Pepper:** `apiKeyPepper`, a new private runtime secret. Without the pepper, a Firestore export can't be turned into working keys.
- **Limits:** at most 5 non-revoked keys per uid, enforced in a transaction on `api_accounts/{uid}.activeKeyCount`.
- **Revocation:** a transaction that is a no-op if `revokedAt` is already set (so a duplicate request can't double-decrement), otherwise sets `revokedAt` and writes `activeKeyCount = Math.max(0, count - 1)`. The instance handling the revocation evicts the hash from its own positive cache immediately. Other instances' 60s positive caches can serve a revoked key for up to 60s. That's documented in the docs and acceptable.
- **Rules:** `api_keys`, `api_accounts` and `api_usage_fallback` are all `allow read, write: if false`. The dashboard goes through server routes.

### D4. Plans as config

- `server/utils/api/plans.ts` defines `PLANS: Record<'free'|'starter'|'pro', { monthlyIncluded, rps, stripePriceLookupKeys: { base?, metered? } }>`. Numbers come from task 1.1.
- Lookup keys (`bmr_api_starter_base`, `bmr_api_starter_metered`, …) decouple code from Stripe price ids. `scripts/stripe-setup-api-billing.ts` creates the products, prices and meter idempotently by lookup key, run against test mode first.
- **Meter:** `event_name: 'bmr_api_request'`, `default_aggregation: sum`, `customer_mapping: by stripe_customer_id`, `value_settings.event_payload_key: 'value'`.
- **Metered prices** are tiered with the first `monthlyIncluded` units at 0, so included calls and overage are one price.

### D5. Usage reporting (exactly-once)

`GET /api/cron/report-usage` runs hourly at `:05`. For the previous hour bucket `H`:

1. Read the uids that had usage in `H` with `SMEMBERS active:{H}` (one round-trip, no keyspace `SCAN`), then `MGET usage:{uid}:{H}` for them. Add any `api_usage_fallback/*_{H}` docs and sum per uid.
2. For each paid account: `stripe.billing.meterEvents.create({ event_name, payload: { stripe_customer_id, value }, identifier: \`${uid}-${H}\`, timestamp: end of H })`. Stripe rejects a duplicate identifier, which makes retries and overlapping runs safe.
3. Record `api_accounts/{uid}.lastReportedHour = H`, then batch-delete that account's `api_usage_fallback/{uid}_{H}` doc. Fallback docs are only deleted after Stripe accepted (or rejected as duplicate) the meter event, so an unreported hour's fallback is never lost. The cron also re-reports any unreported hour from the last 24h (Stripe's identifier dedup window covers that, and the 48h Redis TTL keeps the hourly keys alive for it).

Free accounts are never reported. Failures for one account don't stop the others, and a summary is emailed only if there were failures.

### D6. Accounts, sign-up and Stripe

- **Sign-up** (`/signup`): Firebase `createUserWithEmailAndPassword`, then `sendEmailVerification`, then `POST /api/developer/account`. That endpoint verifies the ID token and creates `api_accounts/{uid}` = `{ plan: 'free', createdAt, stripeCustomerId: null, activeKeyCount: 0 }` with the admin SDK. The `users` doc isn't touched, so the existing rules denylist doesn't need changing.
- **Key creation** requires `email_verified` on the token.
- **Abuse:** sign-up, account creation and key creation are added to the shared limiter (Redis-backed via the same helper) at 5/min per IP.
- **Upgrade:** `POST /api/developer/checkout` creates a Checkout session in subscription mode with the plan's base and metered prices, `metadata: { product: 'bmr_api', uid, plan }`, and reuses or creates the Stripe customer.
- **Manage:** `POST /api/developer/billing-portal` opens a Billing Portal session.
- **Webhook:**
  - `checkout.session.completed` with `metadata.product === 'bmr_api'` sets `api_accounts/{uid}` to `{ plan, stripeCustomerId, subscriptionId, status }`.
  - `customer.subscription.updated` / `.deleted` for subscriptions carrying `metadata.product = 'bmr_api'` (copied onto the subscription via `subscription_data.metadata`) update or downgrade the account to `free`.
  - This branch runs before the territory branches, and the existing `stripe_events` dedup applies.

### D7. v1 response contracts

- **Envelope:** `{ data, meta: { requestId, version: '2026-11-01', dataYear, sources: [{ name, licence, url }] } }`.
- **Errors:** `{ error: { code, message, requestId } }`, using the codes `invalid_api_key`, `rate_limited`, `quota_exceeded`, `invalid_request`, `not_found`, `unsupported_country`, `role_unresolved` (strict mode) and `service_unavailable`. Messages are opaque per §9.3.
- **`/v1/benchmark`:**
  - `location` is required. The role comes from either `soc` or `role`.
  - `data` contains `role { soc, title, resolution }`, `location { name, gss, region }`, `pay { national, regional, regionalBasis, regionalModifier }` (each percentile set `{ p10..p90, median, mean }` with nulls where unpublished) and `economics { cpih, rent, rentToMedianPayRatio }`.
  - When `salary` is given: `score { mca, confidence, breakdown }` and `takeHome { … }`.
  - `live` only when `apiLiveDataEnabled`.
  - A location that doesn't resolve to the UK gives 422 `unsupported_country`.
  - With `strict=true`, a non-`soc`/`synonym` resolution gives 422 `role_unresolved` with alternatives in `error.details`.
- **Data sources** are listed in `meta.sources` with licence text (OGL v3.0 for ONS data), as OGL attribution requires.

### D8. Take-home pay

`shared/utils/takeHomePay.ts` exports `calculateTakeHome({ gross, taxYear, taxRegion: 'rUK'|'scotland', studentLoans: Plan[], pensionPct? })`. It returns `{ incomeTax, nationalInsurance, studentLoan, pension, net, netMonthly, marginalRate, bands[] }`.

- **Rates** live in `TAX_YEARS: Record<'2026-27', {...}>`, each value with a `source` gov.uk URL. They're verified against gov.uk at implementation time (task 1.4), not taken from memory.
- **Covered:** the personal allowance taper above £100k, and Scottish bands applied when `taxRegion` is `scotland`. For `/v1/benchmark` the default `taxRegion` is derived from the location (region `S92000003` → `scotland`) and can be overridden with `tax_region`.
- **Not covered:** marriage allowance, the blind person's allowance and salary sacrifice beyond a flat pension %. Documented as out of scope.

### D9. Portal and playground

- **Pages:** under `app/pages/developers/*`, all on the `developer` layout and fully i18n'd.
- **Docs:** render `public/benchmarkmyrole-openapi.json` with a small in-house renderer component (operations, parameters, example responses), not a third-party docs bundle.
- **Playground:** posts to `POST /api/developer/playground` with the user's Firebase ID token. The server calls the same v1 handler logic in-process as that account, counted and billed as normal, so the page needs no API key in the browser.
- **Unverified users** see the playground disabled with a verify-email prompt.

## Risks / Trade-offs

- **[Risk] Redis outage means unmetered or over-limit usage.**
  → Billable counts fall back to Firestore (D2 step 8), so revenue isn't lost. Rate limiting degrades to per-instance only, which is acceptable for an outage window.
- **[Risk] The webhook mixes territory and API flows until `recruiter-deprecation-and-regional-explorer`.**
  → The API branch is keyed strictly on `metadata.product === 'bmr_api'` and returns before territory logic. Tests assert that territory events never touch `api_accounts` and vice versa.
- **[Risk] Exposing Reed-derived data without a licence.**
  → The flag defaults false. A test asserts the `live` key is absent from v1 responses when the flag is false, including on cached engine outputs.
- **[Risk] Key leakage through logs.**
  → The `Authorization` header is never logged. Error paths log `last4` only, and a unit test asserts `withApi` never passes the raw key to `console.*`.
- **[Trade-off] Up to 60s of revoked-key validity across instances**, in exchange for one Firestore read per minute per key instead of one per request.

## Migration Plan

1. Provision Upstash Redis via the Marketplace on the project (Preview + Production envs).
2. Run the Stripe setup script in **test** mode, then deploy to preview and exercise the full flow with test cards.
3. Add the `api.benchmarkmyrole.com` domain and DNS.
4. Deploy to production with paid checkout disabled (`apiCheckoutEnabled` server flag false), so only the free plan is available. The Stripe secret key is project-wide (live in Production), so paid plans can't go live until the live-mode products exist.
5. On the user's go-ahead, run the setup script in **live** mode, flip `apiCheckoutEnabled`, and verify one real upgrade and downgrade.

Rollback: remove the API host's edge rules (one commit) or detach the domain. Data is additive.
