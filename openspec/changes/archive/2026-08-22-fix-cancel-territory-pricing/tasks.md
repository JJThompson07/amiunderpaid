## 1. Explicit failure on missing pricing

- [x] 1.0 Before shipping, query the live `platform_settings/pricing` document and confirm it has a complete `bandN` entry for every country/band combination currently in use by active recruiters. This change turns a silent `£10` fallback into a hard `500` at cancellation time — if any billing country or band your users actually rely on is genuinely missing from production, this task turns a latent under-charge into an active outage for that recruiter's cancel flow, so the gap must be closed (or the doc corrected) before this ships, not discovered after.
  - Verified via a one-off read-only Firestore query (script deleted after running, no writes made): the live `platform_settings/pricing` doc has complete `band1`–`band5` entries for both `UK` and `USA`, the only two country keys the codebase's currency/pricing logic ever resolves to. Also confirmed 0 users currently have non-empty `activeTerritories`, so there is no live undercharge scenario this fix could turn into an active outage today. Safe to ship.
- [x] 1.1 In `server/api/stripe/cancel-territory.post.ts`, after `countryPricing` is resolved (`:80`), throw immediately when it is falsy:
  ```ts
  if (!countryPricing) {
    throw createError({
      statusCode: 500,
      message: `Pricing bands for ${userData.billingCountry} not found.`
    });
  }
  ```
  matching the shape already used in `server/api/stripe/create-checkout.post.ts:80-84`.
- [x] 1.2 Remove the now-unreachable `|| 10` default at `:88` once the explicit guard is in place, since `countryPricing` (and therefore `bandData`) is guaranteed defined past the guard for a valid band.
  - Deviation from literal wording: under this repo's `noUncheckedIndexedAccess: true` tsconfig, `countryPricing[bandKey]` is still typed `PricingBand | undefined` even though `countryPricing` itself is guaranteed defined — TS can't verify a specific string key exists in a `Record`. Removing `|| 10` without also handling that would either leave a type error or require an unsafe `!` assertion. Instead added an explicit `if (!bandData) throw createError(...)` guard, extending the same "fail loud, not silent" pattern the spec requires to the band dimension as well as the country dimension. This is strictly more correct than the literal instruction and stays within the same file/scope.

## 2. Test coverage

- [x] 2.1 Add a unit test in `server/api/stripe/tests/cancel-territory.spec.ts` asserting a 500 (not a £10 total pushed to Stripe) when `platform_settings/pricing` is missing the caller's billing country.
- [x] 2.2 Add a unit test asserting normal pricing resolution is unaffected when the pricing document is well-formed.
  - Also added a third test covering the band-level guard added in 1.2 (missing `bandN` key within a resolved country), since that guard is new behavior introduced by this change and would otherwise be untested.

## 3. Pattern audit

- [x] 3.1 Review `git diff 0bce84a..HEAD` for other instances where `?.` or `|| <default>` was introduced on a value that previously threw, restricted to pricing, authorisation, and outbound-request paths.
  - Full findings in `audit-notes.md` in this change directory. Authorisation and outbound-request paths reviewed clear (type-tightening, a genuine security improvement, and a preserved throw/rethrow in the restructured market-data fallback orchestration — no silent-default conversions). One real instance of the same bug pattern found in the sibling pricing path `create-checkout.post.ts:126-128`, but it pre-dates `0bce84a` (traced via `git log -S`), so it's outside this task's literal diff scope — logged as a follow-up rather than expanding this change's scope.
- [x] 3.2 File a follow-up ticket per additional instance found (do not fix them in this change).
  - Filed: https://github.com/JJThompson07/amiunderpaid/issues/128

## 4. Verification

- [x] 4.1 Run local verification `pnpm vitest run`.
  - `pnpm vitest run`: 351/351 tests passed (53 files). Also ran `pnpm lint` (prettier + eslint + cspell + `nuxi typecheck`) — clean except the pre-existing, untracked, gitignored `.claude/settings.local.json` formatting warning (unrelated to this change). Also ran `pnpm exec playwright test` — 20/20 passed (chromium, firefox, ssr). Cross-checked against `CODE_STANDARDS.md` §8 (test suite), §9.3/9.4 (error message opacity/status codes — new `500`s match the existing `create-checkout.post.ts` precedent for missing pricing config), §11 (typecheck clean).
