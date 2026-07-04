## 1. Firebase Storage Security Rules

- [x] 1.1 Create `storage.rules` in the workspace root.
- [x] 1.2 Add rule logic to the `recruiter_logos/{userId}/{allPaths=**}` path allowing read access to all, and write access only if authenticated as matching `{userId}`.

## 2. Nitro Backend Pricing Fallbacks

- [x] 2.1 Update `server/api/stripe/create-checkout.post.ts` to declare `DEFAULT_PRICING` fallback matrices and resolve them if the database pricing document is missing.
- [x] 2.2 Update `server/api/stripe/cancel-territory.post.ts` to declare `DEFAULT_PRICING` fallback matrices and resolve them if the database pricing document is missing.
- [x] 2.3 Run typechecks and linting to ensure no compile errors are introduced.

## 3. Local Verification

- [ ] 3.1 Run the local development server.
- [ ] 3.2 Verify that local checkout session generation resolves successfully to Stripe without errors even if you temporarily remove the database `pricing` document.
