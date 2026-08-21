## Why

`server/middleware/rate-limit.ts` has defects in 42 lines. It has **unbounded, amplifiable memory**: `:3` holds an in-process `Map` with no eviction, and `:30-32` overwrites an expired entry rather than deleting it, so a high volume of distinct IPs (genuine or spoofed) grows the key count without bound. And it uses **one bucket across four routes**: `:27` keys on IP alone with no path component, with `MAX_REQUESTS` fixed at 10 for all of `/api/user/leads/submit`, `request-access`, `suggestion`, and `track-search` — the last of which fires once per search, so ten searches in a minute exhausts the shared budget and the eleventh request (which may be the lead submission — the revenue event) gets a 429.

**Correction (verified during implementation, see task 1.0):** this proposal originally also claimed the limiter was bypassable via a spoofed `X-Forwarded-For` header. That claim was written without confirming the deployed platform. This repo is deployed on Vercel (confirmed via DNS: `ns1/ns2.vercel-dns.com`), and Vercel's own documentation states they overwrite `X-Forwarded-For` at the edge and do not forward externally-supplied values, specifically to prevent this exact spoofing. Nitro's Vercel runtime preset does not populate `event.context.clientAddress`, so the app relies on that (trustworthy, on this platform) header. **The limiter is not currently bypassable in production.** This change still switches to `x-vercel-forwarded-for` as defense-in-depth — Vercel's docs note this header stays trustworthy even if a proxy/WAF is later added in front of Vercel, whereas plain `x-forwarded-for` would not — but this is hardening against a future infra change, not closing an active hole.

A limiter with unbounded memory and a shared budget that can block real customers (while adding no real protection against attackers, given the above) is still worth fixing: it creates the belief that these unauthenticated write endpoints (each costing Firestore writes, one dispatching email from the verified sending domain) are protected with route-appropriate limits when they are not, and it can 429 the actual revenue event.

## What Changes

- Read the client IP from `x-vercel-forwarded-for` (falling back to the existing `getRequestIP` behavior for local dev, where that header doesn't exist) as defense-in-depth against a future proxy/WAF added in front of Vercel — not a fix for a currently-exploitable bypass.
- Key the counter on `${ip}:${matchedRoute}` with per-route limits — generous for `track-search`, tight for `leads/submit` and `request-access`.
- Prune expired entries on write, or switch the store to an LRU with a hard maximum size, so memory is bounded.
- Given the serverless deployment target, move the counter to a shared store (Firestore or Upstash) so limits aren't per-instance; if deferred, record the in-memory limitation as a tracked follow-up rather than only a code comment.

## Scope

`server/middleware/rate-limit.ts` and its test suite.

## Non-Goals

- Rate limiting authenticated endpoints — this middleware only guards the four listed unauthenticated write routes.
- Building a general-purpose distributed rate-limiting library; a minimal shared-store implementation scoped to these four routes is sufficient.

## Capabilities

### Modified Capabilities

- `rate-limiting`: expands the single existing requirement into per-route, spoof-resistant, memory-bounded limiting, and adds a requirement for a shared store (or a tracked gap if deferred).

## Impact

- **Affected code:** `server/middleware/rate-limit.ts`, its test file, and (if the shared-store task is not deferred) a new Firestore or Upstash-backed counter utility.
- **Behavioral change:** normal users performing several searches followed by a lead submission are no longer rate limited; spoofed `X-Forwarded-For` values no longer bypass the limit.
