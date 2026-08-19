## Why

`server/middleware/rate-limit.ts` has three distinct defects in 42 lines. It is **bypassable**: `:24` calls `getRequestIP(event, { xForwardedFor: true })` unconditionally, so any client can set a fresh `X-Forwarded-For` header per request and never be limited. It has **unbounded, amplifiable memory**: `:3` holds an in-process `Map` with no eviction, and `:30-32` overwrites an expired entry rather than deleting it, so combined with the spoofable header an attacker can grow the key count without bound. And it uses **one bucket across four routes**: `:27` keys on IP alone with no path component, with `MAX_REQUESTS` fixed at 10 for all of `/api/user/leads/submit`, `request-access`, `suggestion`, and `track-search` — the last of which fires once per search, so ten searches in a minute exhausts the shared budget and the eleventh request (which may be the lead submission — the revenue event) gets a 429.

A limiter that stops customers and not attackers is worse than none: it creates the belief that these unauthenticated write endpoints (each costing Firestore writes, one dispatching email from the verified sending domain) are protected when they are not.

## What Changes

- Honour `X-Forwarded-For` only when the request arrived through a known proxy hop, or use the platform-provided client IP instead.
- Key the counter on `${ip}:${matchedRoute}` with per-route limits — generous for `track-search`, tight for `leads/submit` and `request-access`.
- Prune expired entries on write, or switch the store to an LRU with a hard maximum size, so memory is bounded regardless of spoofing.
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
