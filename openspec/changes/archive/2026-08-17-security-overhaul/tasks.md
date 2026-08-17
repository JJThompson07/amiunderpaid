## 1. Firebase Rules

- [x] 1.1 Create `firestore.rules` at the repository root with deny-by-default, restricting profile writes and making platform settings read-only for clients.

## 2. Admin Security & Middleware

- [x] 2.1 Create `server/middleware/admin-guard.ts` to intercept `/api/admin/*` and call `verifyAdmin(event)`.
- [x] 2.2 Refactor `server/utils/firebase.ts` to ensure `verifyAdmin` validates the `admin: true` custom claim.
- [x] 2.3 Refactor `server/api/admin/delete.post.ts` to enforce a collection whitelist and require non-empty filters.
- [x] 2.4 Move `server/api/user/search-logs.get.ts` to `server/api/admin/search-logs.get.ts` and add tests ensuring it is protected.
- [x] 2.5 Create a temporary script `server/api/admin/migrate-claims.ts` to assign custom claims to existing admin users.

## 3. Search Tracking ID Minting

- [x] 3.1 Update `server/api/user/track-search.post.ts` to use `db.collection('search_history').add()` to mint server-side IDs.
- [x] 3.2 Update `server/api/user/update-search.post.ts` to use `.update()` instead of `.set()`.
- [x] 3.3 Update `app/composables/useSearchTracking.ts` to capture the returned server ID and use it for subsequent updates.

## 4. Stripe Checkout Security

- [x] 4.1 Refactor `server/api/stripe/create-checkout.post.ts` to strictly fail if no valid token is provided, preventing `anonymous` fallbacks.
- [x] 4.2 Refactor `server/api/stripe/webhook.post.ts` to wrap exclusive territory claiming inside `db.runTransaction` and fail if the month is already taken.

## 5. Input Validation & Error Masking

- [x] 5.1 Refactor `server/api/user/leads/submit.post.ts` to validate the recipient email format and sanitize HTML entities from inputs before generating email templates.
- [x] 5.2 Refactor `server/api/market-data/jobs.ts` and `server/api/market-data/salary.ts` to ensure 503 errors do not leak upstream `ofetch` exception payloads containing API keys.

## 6. Validation

- [x] 6.1 Run unit and e2e test suites (`pnpm vitest run` and `pnpm test:e2e`) to ensure no regressions are introduced.
