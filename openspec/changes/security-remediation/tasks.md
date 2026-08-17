## 1. Firebase Rules and Infrastructure

- [x] 1.1 Create `firebase.json` to manage deployment for `firestore.rules`.
- [x] 1.2 Update `firestore.rules` to include missing collections and missing user profile fields (`exclusiveDiscount`, `stripeSubscriptionId`). Update related unit tests in `server/api/tests/rules.spec.ts` (or similar rules test file).
- [x] 1.3 Create `scripts/grant-admin.ts` and `server/api/admin/grant-admin.post.ts` to provision `admin: true` custom claims securely.
- [x] 1.4 Remove the dangling `migrate-claims` substring bypass from `server/middleware/admin-guard.ts`.

## 2. Server-Side Validations & Hardening

- [x] 2.1 Update `server/api/stripe/create-checkout.post.ts` and `server/api/admin/recruiters/discount.post.ts` to strictly clamp `basicDiscount` and `exclusiveDiscount` values between 0 and 100. Write corresponding tests.
- [x] 2.2 Update `server/api/stripe/webhook.post.ts` to catch territory conflicts during the transaction, refund the customer, and return a 200 OK so Stripe stops retrying the webhook. Write corresponding tests.
- [x] 2.3 Update `server/api/admin/seed.post.ts` to restrict arbitrary collection targeting by applying the `ALLOWED_COLLECTIONS` allow-list pattern.

## 3. Rate Limiting & Tracking Protections

- [x] 3.1 Create `server/utils/searchToken.ts` using `node:crypto` to export HMAC sign and verify methods.
- [x] 3.2 Update `server/api/user/track-search.post.ts` to mint the HMAC token, and `server/api/user/update-search.post.ts` to verify it before accepting search history updates. Write corresponding tests.
- [x] 3.3 Create a new middleware at `server/middleware/rate-limit.ts` utilizing an in-memory budget cache keyed on IP to rate-limit `/api/user/leads/submit`, `/api/user/recruiter/request-access`, `/api/user/suggestion`, and `/api/user/track-search`. Write corresponding tests.
- [x] 3.4 Update `server/api/user/leads/submit.post.ts` to pass `agencyName` through `sanitizeHTML()` before interpolating it into the email payload.

## 4. Verification & Documentation

- [x] 4.1 Run local verification `pnpm vitest run` to ensure all existing and new tests pass.
- [x] 4.2 Run `pnpm test:coverage` to ensure 80% coverage on all modified files.
- [x] 4.3 Add comprehensive inline comments to all modified files (especially rules, middleware, and API endpoints) explaining *why* the remediation was necessary and *how* the new secure approach benefits the system. This will guide future human and AI reviewers.
