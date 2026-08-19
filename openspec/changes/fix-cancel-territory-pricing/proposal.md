## Why

The TypeScript strictness pass changed a property access to optional chaining in `server/api/stripe/cancel-territory.post.ts:87`: `countryPricing?.[...]`. If `platform_settings/pricing` exists but is empty, or is missing the caller's billing-country key, `countryPricing` (`:80`) is `undefined`. Previously the bracket access threw a `TypeError` (a 500). Now `bandData` is `undefined` and the code falls through to `basicPrice = 10` for every territory (`:88`), and that total is pushed straight to a live Stripe subscription (`:110-124`). `server/api/stripe/create-checkout.post.ts:80-84` already handles the equivalent missing-pricing case correctly by throwing, so the pattern to follow already exists in this repo.

A misconfigured or partially written pricing document silently reprices a recruiter's entire subscription at £10/territory instead of erroring — for a band 5 territory that is a large under-charge, applied with no error and no log; the first signal is a revenue discrepancy at month end. This is one instance of a broader pattern: the same `?.`/`|| default` substitution was applied across roughly 200 files in the same strictness pass, converting loud failures into quiet wrong answers wherever it landed on a value that previously threw.

## What Changes

- `cancel-territory.post.ts` throws explicitly (matching `create-checkout.post.ts:80-84`'s shape) when `countryPricing` is absent, instead of silently defaulting to £10.
- A targeted review of `git diff 0bce84a..HEAD` for other places where `?.` or `|| default` was introduced on a value that previously threw, specifically in pricing, authorisation, or outbound-request paths. Findings outside `cancel-territory.post.ts` are logged as follow-up tickets rather than fixed in this change, to keep this change reviewable.

## Scope

`server/api/stripe/cancel-territory.post.ts` and its test suite, plus a short audit note listing any other instances found by the `git diff` review.

## Non-Goals

- Re-running the entire strictness pass or reverting `any` removal — only the specific silent-fallback instance(s) it introduced.
- Fixing every instance the audit review turns up in this same change; those become separate follow-up tickets so this stays a small, reviewable fix.

## Capabilities

### Modified Capabilities

- `territory-cancellation-integrity`: adds a requirement that missing pricing configuration fails loudly during cancellation, matching the existing checkout-time behavior.

## Impact

- **Affected code:** `server/api/stripe/cancel-territory.post.ts`, its test file.
- **Behavioral change:** a cancellation against a misconfigured pricing document now returns a 500 instead of silently under-billing; this is the same trade-off already made at checkout time in `create-checkout.post.ts`.
