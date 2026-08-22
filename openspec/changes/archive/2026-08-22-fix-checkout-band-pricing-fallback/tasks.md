## 1. Explicit failure on missing band pricing

- [x] 1.0 **Pre-flight:** queried the live `platform_settings/pricing` document (read-only, script deleted after running) and confirmed complete `band1`-`band5` entries for both `UK` and `USA`. Cross-checked `utils/bands/uk.ts`/`usa.ts`'s `JobBand` enum only ever produces values 1-5, so no territory can resolve to a band absent from pricing today — this change can't turn a live gap into an active outage.
- [x] 1.1 In `server/api/stripe/create-checkout.post.ts`, after `bandData` is resolved (`:126`), throw immediately when it is falsy, matching the shape already used for the `countryPricing` guard (`:81-85`) and `cancel-territory.post.ts`'s band-level guard.
- [x] 1.2 Remove the `|| 10` / `|| 50` fallback defaults once the explicit guard is in place.

## 2. Test coverage

- [x] 2.1 Add a unit test in `server/api/stripe/tests/create-checkout.spec.ts` asserting a 500 (and no Stripe session created) when the resolved band is missing from the pricing document.
- [x] 2.2 Verified the new test actually catches the regression: reverted the guard temporarily and confirmed the test failed (checkout succeeded silently at the fallback price) before restoring the fix.

## 3. Verification

- [x] 3.1 Run local verification `pnpm vitest run` and `pnpm lint`.
