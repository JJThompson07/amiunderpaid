## Why

A recent security audit highlighted critical vulnerabilities in the API layer, particularly the lack of robust authentication and authorization on `/api/admin/*` routes, unauthenticated destructive endpoints, and unauthenticated mail relays. Immediate remediation is required to prevent unauthorized data access, data loss, and abuse of the platform.

## What Changes

- Introduce a centralized `admin-guard.ts` server middleware to protect all `/api/admin/*` routes by default.
- Refactor `verifyAdmin` to validate a Firebase custom claim (`admin: true`) rather than just checking if the token is valid.
- Add strict validation to the `/api/admin/delete` endpoint to prevent arbitrary collection deletion.
- Establish baseline `firestore.rules` (deny-by-default, restrict self-writes to `users/{uid}`, prevent role escalation).
- Enforce server-side ID minting in search tracking to prevent ID collisions and arbitrary document overwrites.
- Sanitize HTML inputs and validate emails in the leads submit endpoint to prevent phishing relays.
- Reject unauthenticated Stripe checkout requests (fail closed instead of falling through to `anonymous`).
- Add a transaction to territory purchases in the Stripe webhook to prevent double-selling exclusive months.
- Omit raw Adzuna error payloads from client-facing 503 responses to prevent API key leakage.

## Capabilities

### New Capabilities

- `admin-guard`: Middleware enforcement and role-based access control for administrative endpoints.
- `firestore-rules`: Firebase security rules for data access and integrity.
- `stripe-checkout-security`: Checkout security improvements and race condition fixes for exclusive territories.
- `leads-relay-security`: Validation and sanitization for recruiter lead emails.

### Modified Capabilities

- `analytics-tracking`: Requires server-side ID minting for `track-search` and `update-search` to prevent arbitrary document overwrites.
- `admin-search-log-metrics`: Moves `/api/user/search-logs` to the `/api/admin/` namespace and enforces authentication.

## Impact

- **Affected Code**: `server/api/admin/*`, `server/api/user/*`, `server/api/stripe/*`, `server/utils/firebase.ts`, `server/api/market-data/jobs.ts`, `server/api/market-data/salary.ts`.
- **Infrastructure**: Addition of `firestore.rules` to the repository.
- **Client Impact**: `app/composables/useSearchTracking.ts` will need to expect a server-minted ID rather than providing one.
