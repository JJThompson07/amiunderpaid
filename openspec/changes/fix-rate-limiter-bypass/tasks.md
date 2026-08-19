## 1. Trustworthy client IP

- [ ] 1.0 Confirm the actual deployed hosting platform (this repo has no committed Nitro `preset` and the README lists Vercel, Netlify, and Cloudflare Pages as candidates — check the real deploy target, e.g. via the hosting dashboard or deploy config, don't assume). Identify that platform's actual trusted client-IP header/mechanism before writing task 1.1, since getting this wrong either re-opens the spoofing bypass or collapses every user onto one IP bucket and rate-limits legitimate traffic site-wide.
- [ ] 1.1 In `server/middleware/rate-limit.ts:24`, stop trusting `X-Forwarded-For` unconditionally. Use the platform-provided client IP confirmed in 1.0 (e.g. Nitro's built-in trusted-proxy support via `nitro.rateLimit`/`x-nitro-forwarded-for` conventions, a platform-specific header, or `getRequestIP(event, { xForwardedFor: false })` behind a confirmed trusted proxy) so a client-supplied header cannot reset the key.
- [ ] 1.2 Add a test that simulates the confirmed platform's real proxy header shape (not a generic mock) so this doesn't regress silently if the header format assumption was wrong.

## 2. Per-route buckets

- [ ] 2.1 Key `rateLimits` on `` `${ip}:${matchedRoute}` `` instead of `ip` alone.
- [ ] 2.2 Replace the single `MAX_REQUESTS = 10` constant with per-route limits: generous for `/api/user/track-search` (e.g. 30/minute), tight for `/api/user/leads/submit` and `/api/user/recruiter/request-access` (e.g. 5/minute), moderate for `/api/user/suggestion`.

## 3. Bounded memory

- [ ] 3.1 On each write, delete (not overwrite) entries whose window has expired, or replace the `Map` with an LRU cache with a hard maximum entry count.

## 4. Shared store (or tracked gap)

- [ ] 4.1 Evaluate moving the counter to Firestore or Upstash so limits are consistent across serverless instances. If implemented, add the store as a small utility (e.g. `server/utils/rateLimitStore.ts`) used by the middleware.
- [ ] 4.2 If the shared-store move is deferred, open a follow-up ticket and reference it in a code comment at the top of `rate-limit.ts`, rather than leaving only the existing comment.

## 5. Tests

- [ ] 5.1 Add tests in `server/middleware/tests/rate-limit.spec.ts` covering: the limit triggering, the window resetting after expiry, two different routes not sharing a budget for the same IP, and a spoofed `X-Forwarded-For` not resetting the count.

## 6. Manual verification

- [ ] 6.1 Simulate a normal browsing session (eight to ten searches followed by a lead submission) and confirm no 429 is returned.

## 7. Verification

- [ ] 7.1 Run local verification `pnpm vitest run`.
