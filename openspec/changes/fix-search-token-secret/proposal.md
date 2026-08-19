## Why

The search-tracking HMAC is signed and verified with the Stripe webhook signing secret, with a hardcoded fallback: `config.stripeWebhookSecret || 'fallback-secret-for-dev'` in both `server/api/user/track-search.post.ts:40` and `update-search.post.ts:27`. This has two problems: a secret dedicated to Stripe signature verification is reused for an unrelated purpose, and in any environment where `STRIPE_WEBHOOK_SECRET` is unset — a preview deploy, a misconfigured environment — every search token is forgeable by anyone holding the repository, since the fallback literal is committed. Where that fallback is in effect, any caller who knows a `search_history` document ID can overwrite `mcaScore`, `marketAverage`, `governmentAverage`, and percentile fields on it; those records are the analytics used to price territories and decide which regions to sell. Key reuse also means rotating the Stripe webhook secret silently invalidates every outstanding search token, and vice versa — coupling two unrelated rotation schedules. CODE_STANDARDS §9.1/§9.2 already require every secret to be read from private `runtimeConfig` with no committed fallback, which this violates.

Separately, `server/utils/searchToken.ts:14` compares HMACs with `===` rather than a timing-safe comparison. This is real but lower priority: exploiting it requires already knowing an unenumerable 20-character Firestore ID and extracting a 64-character HMAC through nanosecond timing deltas across network jitter, to win the ability to edit analytics on a single row — worth fixing for hygiene, not the primary risk here.

## What Changes

- Register a dedicated `searchTokenSecret` in the private block of `runtimeConfig` (`nuxt.config.ts`) and add it to `.env.example`.
- Update both `track-search.post.ts` and `update-search.post.ts` to use it, with no `||` fallback; if the secret is missing, the endpoint fails closed with a 500 instead of signing with a default.
- Update `server/utils/searchToken.ts` to compare using `crypto.timingSafeEqual` over equal-length buffers.
- Grep `server/` for any other `|| '<literal>'` fallback on a credential path and confirm none remain.

## Scope

`server/api/user/track-search.post.ts`, `server/api/user/update-search.post.ts`, `server/utils/searchToken.ts`, `nuxt.config.ts`, `.env.example`, and their test suites.

## Non-Goals

- Rotating the existing `STRIPE_WEBHOOK_SECRET` or any currently-deployed search tokens — this change only stops new tokens from being signed with the wrong/fallback secret going forward. Any deployed environment missing `SEARCH_TOKEN_SECRET` needs the env var set before this change ships there.
- Broader credential-management tooling beyond this one secret.

## Capabilities

### Modified Capabilities

- `analytics-tracking`: strengthens the "Authenticated analytics updates" requirement to require a dedicated, non-defaultable secret and a timing-safe comparison.

## Impact

- **Affected code:** `server/api/user/track-search.post.ts`, `server/api/user/update-search.post.ts`, `server/utils/searchToken.ts`, `nuxt.config.ts`, `.env.example`.
- **Deployment:** every environment (including preview deploys) must have `SEARCH_TOKEN_SECRET` set before this ships, or search tracking/updating will start failing closed with a 500.
