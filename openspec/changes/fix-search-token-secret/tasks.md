## 1. Dedicated secret

- [x] 1.1 In `nuxt.config.ts`, add `searchTokenSecret: process.env.SEARCH_TOKEN_SECRET` to the private `runtimeConfig` block (alongside `stripeWebhookSecret`).
- [x] 1.2 Add `SEARCH_TOKEN_SECRET=` to `.env.example` with a short comment explaining it must be a random 32+ byte value distinct from the Stripe webhook secret.

## 2. Fail closed, no fallback literal

- [x] 2.1 In `server/api/user/track-search.post.ts:40`, replace `config.stripeWebhookSecret || 'fallback-secret-for-dev'` with `config.searchTokenSecret`, and throw a 500 before signing if it is falsy.
- [x] 2.2 Apply the same change in `server/api/user/update-search.post.ts:27`.

## 3. Timing-safe comparison

- [x] 3.1 In `server/utils/searchToken.ts`, replace the `===` comparison in `verifySearchToken` with `crypto.timingSafeEqual`, comparing the HMAC digests as `Buffer`s and returning `false` (not throwing) when lengths differ.

## 4. Tests

- [x] 4.1 Add/update tests covering: a valid token verifies, a wrong token is rejected, a missing token is rejected, and a missing `searchTokenSecret` causes the endpoint to fail closed with a 500 rather than signing with a default.

## 5. Sweep for other fallback literals

- [x] 5.1 Grep `server/` for `|| '` patterns on anything that reads like a credential/secret and confirm `fallback-secret-for-dev` was the only instance; note the grep command and result in the PR description.
      Command: `grep -rnE "\|\|\s*'[^']*'" server/ | grep -iE "secret|key|token|password|credential"`. Result: only the `fallback-secret-for-dev` instances fixed by this change; the remaining matches are `|| ''` defaults on possibly-undefined bearer tokens (`authHeader.split('Bearer ')[1] || ''`), which fail closed via `verifyIdToken` rejecting an empty string rather than signing/verifying with a default secret.

## 6. Verification

- [x] 6.1 Confirm `SEARCH_TOKEN_SECRET` is set in every deployed environment (production, preview) before merging. Note: `track-search`/`update-search` are already called via `fetch(..., { keepalive: true })` wrapped in a client-side try/catch that silently swallows failures (`useUserLogging.ts`), so a missed env var degrades to search analytics not being recorded rather than breaking the user-facing search flow — real but lower-urgency than a user-facing outage, still confirm before merging. Confirmed set in Vercel (production + preview) 2026-08-21, alongside `RESEND_API_KEY`.
- [x] 6.2 Run local verification `pnpm vitest run`.
