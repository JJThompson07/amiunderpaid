## Context
Resolving critical findings from Phase 1 of the security audit. The architecture requires securing server-side endpoints, strict database access, and mitigating DoS via rate limits. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Implement all Phase 1 security remediations cleanly and idiomatically.
- Maintain existing functionality for authorized users.

**Non-Goals:**
- Adding a Redis cluster for rate limiting (we will use in-memory Nitro storage since the app is on a single instance).
- Phase 2-5 remediations.

## Decisions

### 1. Rate Limiting Strategy
- **Decision:** Key on `getRequestIP` and use an in-memory dictionary or `lru-cache` via Nuxt's internal storage.
- **Rationale:** Sufficient for stopping runaway client loops and simple spam without adding external infrastructure dependencies (like Redis) right now.
- **Alternatives:** Firebase/Upstash. Too much overhead for immediate ship-blocker mitigation.

### 2. Analytics Token (HMAC)
- **Decision:** Use Node's `node:crypto` HMAC to sign the search history ID when created in `track-search.post.ts`. The client returns the token for `update-search.post.ts` to verify.
- **Rationale:** Ensures that the client providing the update is the original creator of that search ID, without needing full user accounts.

### 3. Admin Provisioning
- **Decision:** Create `server/api/admin/grant-admin.post.ts` to set claims programmatically for existing admins to use. For the "first" admin (chicken-and-egg problem), create `scripts/grant-admin.ts` that uses the service account locally to bypass the HTTP API entirely.
- **Rationale:** Clear separation of concerns; keeps production endpoints secure while providing a backdoor for local devs with service account access.

## Risks / Trade-offs
- **Risk (Rate Limit Reset):** In-memory rate limits reset on server restart. → **Mitigation:** Acceptable trade-off for current scale.
- **Risk (Stripe Webhook):** Discarding conflicts as 200 OK prevents retries. → **Mitigation:** We explicitly log and process a refund before returning 200, ensuring the user gets their money back if a double-booking occurs.
