## Why

When deploying to production:

1. **Firebase Storage Permissions**: Recruiter logo uploads will fail on the client side unless a `storage.rules` file is created and deployed to the Firebase project, as writes are denied by default.
2. **Dynamic Checkout Pricing Reliability**: Currently, both `create-checkout.post.ts` and `cancel-territory.post.ts` crash with a 500 error if the Firestore document `platform_settings/pricing` is missing. Having fallback pricing defaults prevents checkout disruptions in fresh environments.

## What Changes

- **Firebase Storage Security Rules**: Create a `storage.rules` file in the workspace root configuring write permissions for `recruiter_logos/{userId}/*` (only allowed if authenticated and matching the owner's `userId`) and allowing public read access.
- **Nitro Backend Pricing Fallbacks**: Modify `server/api/stripe/create-checkout.post.ts` and `server/api/stripe/cancel-territory.post.ts` to load default pricing structures (matching the dashboard's default banding values) if the `platform_settings/pricing` document is not present in Firestore.

## Capabilities

### New Capabilities

- `storage-security-rules`: Configure Firebase Storage rules to secure logo uploads while allowing public read access.
- `stripe-pricing-fallback`: Apply backend pricing fallbacks in checkout and cancellation routes to prevent runtime database failures.

### Modified Capabilities

<!-- No requirement changes to existing specs -->
