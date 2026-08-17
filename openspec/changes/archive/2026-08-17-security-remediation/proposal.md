## Why

A recent security audit identified 10 critical ship-blockers (Phase 1) in the current implementation. These include missing protected fields in Firestore rules, trusting client payloads for financial discounts, vulnerable bypasses in admin middleware, and unthrottled public write endpoints. These must be remediated immediately to ensure data integrity, prevent financial abuse, and secure the platform before further feature development.

## What Changes

- Add missing fields (`exclusiveDiscount`, `stripeSubscriptionId`) and explicit rules for every collection to `firestore.rules`.
- Wire `firebase.json` to ensure Firestore rules are actively deployed.
- Implement server-side clamping for discounts in `/api/stripe/create-checkout.post.ts` and `/api/admin/recruiters/discount.post.ts`.
- Create `/api/admin/grant-admin.post.ts` and a CLI script (`scripts/grant-admin.ts`) to securely provision the `admin: true` custom claim.
- Remove the unsafe `migrate-claims` substring bypass from `server/middleware/admin-guard.ts`.
- Add short-lived HMAC signed tokens to `track-search.post.ts` and verify them in `update-search.post.ts` to prevent arbitrary analytics corruption.
- Implement a Nitro rate-limiting middleware (`server/middleware/rate-limit.ts`) to throttle unauthenticated write endpoints.
- Apply HTML sanitization (`sanitizeHTML`) to the `agencyName` field in the lead submission email templates to prevent stored XSS.
- Apply collection allow-listing to `server/api/admin/seed.post.ts`.
- Update `server/api/stripe/webhook.post.ts` to gracefully catch and discard business territory conflicts (stopping infinite Stripe retries).

## Capabilities

### New Capabilities
- `rate-limiting`: Middleware to enforce API rate limits on public write endpoints.
- `admin-provisioning`: A dedicated API and script for securely provisioning admin access.

### Modified Capabilities
- `firestore-rules`: Expanding rule coverage to all client-touched collections and protecting additional user fields.
- `stripe-checkout-security`: Enforcing discount bounds and webhook conflict handling.
- `admin-guard`: Removing the wildcard bypass exception.
- `analytics-tracking`: Implementing HMAC verification for search history updates.
- `leads-relay-security`: Escaping HTML in email templates and enforcing rate limits.

## Impact

- **Security**: Significantly reduces attack surface across Firestore, API endpoints, and email delivery.
- **Infrastructure**: Adds `firebase.json` which governs deployments.
- **Dependencies**: May require a rate-limiting package or in-memory tracking structure.
- **Operations**: Changes how admins are provisioned (via CLI script instead of direct DB edit).
