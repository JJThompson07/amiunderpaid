## Pattern audit: silent `?.`/`|| default` on values that previously threw

Scope: `git diff 0bce84a..HEAD`, restricted to pricing, authorisation, and outbound-request paths (per tasks.md 3.1).

### Reviewed and clear

- **Authorisation**: `server/middleware/admin-guard.ts`, `server/utils/firebase.ts` (`verifyAdmin`, `useAdminApp`, `batchDelete`, `batchSeed`), `server/api/admin/grant-admin.post.ts`, `server/api/admin/recruiters/{accept,reject}.post.ts`. Changes in this diff are `any` → proper-type tightening, or (in `admin-guard.ts`) a genuine security _improvement_ (removed a `migrate-claims` substring exemption). No throw was converted to a silent default.
- **Outbound-request**: `server/utils/{adzuna,jooble,reed}.ts`, `server/utils/fallback.ts`, `server/api/market-data/{jobs,salary}.ts`. The Adzuna→Reed/Jooble fallback orchestration was substantially restructured (moved into a `defineCachedFunction`-wrapped `fetchFromProviders`), but the throw/rethrow behavior was preserved — the `catch` block re-throws (`throw e`) when the error isn't a recognized fallback-triggering status. The `catSnap.data()?.cache || 30` cache-TTL default is a legitimate default value (not a converted throw); the 120→30 day reduction is the subject of the already-tracked `fix-fallback-cache-ttl` backlog item, not a new finding here.
- **Pricing**: `server/api/stripe/cancel-territory.post.ts` — the subject of this change.

### Finding logged as a follow-up (pre-existing, not introduced by 0bce84a..HEAD)

- **`server/api/stripe/create-checkout.post.ts:126-128`** has the identical bug pattern this change fixes, one dimension over: `countryPricing` is guarded (throws if missing, `:81-85`), but the band-level lookup right after it is not —
  ```ts
  const bandData = countryPricing[`band${safeBand}`];
  let basicPrice = bandData?.basic || 10;
  let exclusivePrice = bandData?.exclusive || 50;
  ```
  If `safeBand` resolves to a band number missing from the country's pricing bands, this silently prices at £10 basic / £50 exclusive instead of failing loudly, at checkout time (new-subscription creation), rather than cancellation time.
  - `git log -S"bandData?.basic || 10"` traces this to `e26fac6` (the original Stripe feature commit) — it predates the 0bce84a strictness pass, so it's out of this task's literal `git diff` scope, but it's the same class of bug and worth fixing for the same reason.
  - Not fixed here per this change's Non-Goals (keep this change small and reviewable). **Follow-up ticket to file**: apply the same explicit-throw treatment to the band-level lookup in `create-checkout.post.ts`, matching the guard just added to `cancel-territory.post.ts:92-98`.
