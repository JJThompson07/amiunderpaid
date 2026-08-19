## 1. Explicit failure on missing pricing

- [ ] 1.0 Before shipping, query the live `platform_settings/pricing` document and confirm it has a complete `bandN` entry for every country/band combination currently in use by active recruiters. This change turns a silent `£10` fallback into a hard `500` at cancellation time — if any billing country or band your users actually rely on is genuinely missing from production, this task turns a latent under-charge into an active outage for that recruiter's cancel flow, so the gap must be closed (or the doc corrected) before this ships, not discovered after.
- [ ] 1.1 In `server/api/stripe/cancel-territory.post.ts`, after `countryPricing` is resolved (`:80`), throw immediately when it is falsy:
  ```ts
  if (!countryPricing) {
    throw createError({ statusCode: 500, message: `Pricing bands for ${userData.billingCountry} not found.` });
  }
  ```
  matching the shape already used in `server/api/stripe/create-checkout.post.ts:80-84`.
- [ ] 1.2 Remove the now-unreachable `|| 10` default at `:88` once the explicit guard is in place, since `countryPricing` (and therefore `bandData`) is guaranteed defined past the guard for a valid band.

## 2. Test coverage

- [ ] 2.1 Add a unit test in `server/api/stripe/tests/cancel-territory.spec.ts` asserting a 500 (not a £10 total pushed to Stripe) when `platform_settings/pricing` is missing the caller's billing country.
- [ ] 2.2 Add a unit test asserting normal pricing resolution is unaffected when the pricing document is well-formed.

## 3. Pattern audit

- [ ] 3.1 Review `git diff 0bce84a..HEAD` for other instances where `?.` or `|| <default>` was introduced on a value that previously threw, restricted to pricing, authorisation, and outbound-request paths.
- [ ] 3.2 File a follow-up ticket per additional instance found (do not fix them in this change).

## 4. Verification

- [ ] 4.1 Run local verification `pnpm vitest run`.
