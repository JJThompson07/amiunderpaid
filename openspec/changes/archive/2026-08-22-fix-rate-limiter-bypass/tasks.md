## 1. Trustworthy client IP

- [x] 1.0 Confirmed via DNS (`ns1/ns2.vercel-dns.com`) and Vercel's docs (`/docs/headers/request-headers`) that this is deployed on Vercel, that Vercel overwrites `X-Forwarded-For` at the edge and does not forward client-supplied values (spoofing is not currently possible), and that Nitro's Vercel runtime preset doesn't populate `event.context.clientAddress`. Trusted mechanism: `x-vercel-forwarded-for` header, guaranteed stable even if a proxy is later added in front of Vercel. See proposal.md's "Correction" note.
- [x] 1.1 In `server/middleware/rate-limit.ts`, read the client IP from `x-vercel-forwarded-for` first (defense-in-depth per 1.0), falling back to the existing `getRequestIP(event, { xForwardedFor: true })` behavior for local dev where that header doesn't exist.
- [x] 1.2 Added a test simulating Vercel's real `x-vercel-forwarded-for` header shape, plus a test confirming a spoofed plain `x-forwarded-for` doesn't override it.

## 2. Per-route buckets

- [x] 2.1 Key `rateLimits` on `` `${ip}:${matchedRoute}` `` instead of `ip` alone.
- [x] 2.2 Replace the single `MAX_REQUESTS = 10` constant with per-route limits: generous for `/api/user/track-search` (e.g. 30/minute), tight for `/api/user/leads/submit` and `/api/user/recruiter/request-access` (e.g. 5/minute), moderate for `/api/user/suggestion`.

## 3. Bounded memory

- [x] 3.1 On each write, delete (not overwrite) entries whose window has expired, or replace the `Map` with an LRU cache with a hard maximum entry count.

## 4. Shared store (or tracked gap)

- [x] 4.1 Evaluated: deferred. Given current low traffic, a Firestore/Upstash-backed counter would add a round-trip to every request on these 4 routes for limited benefit today. User decision: defer, keep in-memory (now bounded + per-route), track as a follow-up.
- [x] 4.2 Deferred-gap comment added at the top of `rate-limit.ts`, referencing this change's tasks.md section 4 rather than only the prior generic comment.

## 5. Tests

- [x] 5.1 Added tests in `server/middleware/tests/rate-limit.spec.ts` covering: the limit triggering, the window resetting after expiry, two different routes not sharing a budget for the same IP, and a spoofed `x-forwarded-for` not overriding `x-vercel-forwarded-for`.

## 6. Manual verification

- [x] 6.1 Verified against the running local dev server: 10 requests to `/api/user/track-search` all returned 200, followed by a request to `/api/user/leads/submit` which returned 400 (endpoint's own validation error on an empty body) rather than 429 — confirms the limiter did not block it.

## 7. Verification

- [x] 7.1 Ran `pnpm vitest run` (348/348 passing), `pnpm lint` (passing — spellcheck, typecheck, prettier, structure-lint, code-standards, eslint), and `pnpm test:e2e` (20/20 passing).
