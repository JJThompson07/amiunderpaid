## Why

Filed as GitHub issue #128 during the pattern audit for `fix-cancel-territory-pricing`. In `server/api/stripe/create-checkout.post.ts:126-128`, `countryPricing` is guarded (throws a 500 if missing, `:81-85`), but the band-level lookup right after it is not:

```ts
const bandData = countryPricing[`band${safeBand}`];
let basicPrice = bandData?.basic || 10;
let exclusivePrice = bandData?.exclusive || 50;
```

If `safeBand` resolves to a band number missing from that country's pricing bands, this silently prices the checkout at £10 basic / £50 exclusive instead of failing loudly — the same bug class already fixed in `cancel-territory.post.ts`, one dimension over, and at checkout time instead of cancellation time. Traced via `git log -S"bandData?.basic || 10"` to `e26fac6`, the original Stripe feature commit, predating the TS-strictness pass that introduced the equivalent `cancel-territory.post.ts` bug.

## What Changes

- `create-checkout.post.ts` throws explicitly (matching the existing `countryPricing` guard's shape, and `cancel-territory.post.ts`'s band-level guard) when `bandData` is absent for the resolved band, instead of silently defaulting to £10/£50.

## Scope

`server/api/stripe/create-checkout.post.ts` and its test suite.

## Non-Goals

- Changing how `safeBand` is resolved from the territory lookup — only what happens when the resolved band is missing from pricing.

## Capabilities

### Modified Capabilities

- `stripe-checkout-security`: extends the existing "Server-side discount clamping" area of checkout pricing integrity to also require the band-level pricing lookup to fail loudly when missing, matching the country-level guard already required.

## Impact

- **Affected code:** `server/api/stripe/create-checkout.post.ts`, its test file.
- **Behavioral change:** a checkout against a resolved band missing from the pricing document now returns a 500 instead of silently under/over-charging; this is the same trade-off already made for `cancel-territory.post.ts` and for the country-level guard in this same file.
- **Production risk:** verified live via a one-off read-only Firestore read (script deleted after running, no writes made) that `platform_settings/pricing` has complete `band1`-`band5` entries for both `UK` and `USA`, and confirmed the `JobBand` enum (`utils/bands/uk.ts`/`usa.ts`) only ever produces values 1-5 — so no territory can resolve to a band this pricing document lacks. Safe to ship as a hard failure.
