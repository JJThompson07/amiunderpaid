## Why

We need the ability for system administrators to grant recruiters a "National" tier for either the UK or USA. This grants basic-level visibility across every territory in that country for the categories they already cover via their existing `coveredCategories` array. The cost is a flat charge equal to a single Band 1 basic price in that country's currency (minus their basic discount).

The architecture relies on a profile-level boolean flag (`isUkNational`, `isUsaNational`) rather than a pseudo-territory in `activeTerritories`, preventing recruiters from self-claiming the tier via the standard territory checkout wizard.

> [!IMPORTANT]
> **Open Product Question for Josh:** Because national reach is defined as "whatever categories they currently cover", a nationally-flagged recruiter can unilaterally expand their paid national reach for free simply by adding new categories to their profile. Is this acceptable (simplest), or should granting national status freeze/snapshot the category list at the time of the grant (requires a more complex data model)?

## What Changes

**1. Data Model**

- Add `isUkNational?: boolean` and `isUsaNational?: boolean` to `UserProfile` in `shared/utils/types.ts`.

**2. Core Search Engine (`recruiter-card.get.ts`)**

- During a local search, determine the country from the `territoryId` (< 200 = UK, else USA).
- Execute a live query against the `users` collection to find users where the respective national flag is `true` AND `coveredCategories` contains the searched category.
- Remove the existing early return (`if (!claimSnap.exists)`) so national recruiters are still yielded even if no local territory claim document exists.
- Merge the resulting UIDs into the local `basicOwners` pool before the random shuffle/cap logic.

**3. Pricing Recalculation**

- Update the pricing loops in BOTH `server/api/stripe/cancel-territory.post.ts` and `server/api/stripe/create-checkout.post.ts` to add the Band 1 basic price (with discount applied) for each active national flag.

**4. Admin API (`set-national.post.ts`)**

- A new endpoint to grant or revoke the national flag.
- On grant: Sets the flag, clears any local territories for that country, and recalculates the Stripe subscription.
- On revoke: Clears the flag, leaving the user with zero local coverage in that country (they must re-purchase locally if desired), and recalculates the Stripe subscription.

**5. UI and Testing**

- Add grant/revoke toggles to the admin dashboard.
- Display a "National Coverage" banner/badge on the recruiter dashboard (with i18n support).
- Add new unit tests for the updated endpoints and search queries.
- Manually create a composite index in Firestore for the new search query.

## Capabilities

### Modified Capabilities

- `recruiter-card-search`: Live querying and merging of national flagged profiles into local basic pools.
- `admin-recruiter-management`: Toggle national flags and synchronously update Stripe billing.
- `stripe-checkout`: Include flat national rates in standard territory checkout loops.

## Impact

- `shared/utils/types.ts`
- `server/api/user/search/recruiter-card.get.ts`
- `server/api/stripe/cancel-territory.post.ts`
- `server/api/stripe/create-checkout.post.ts`
- `server/api/admin/recruiters/set-national.post.ts`
- `app/pages/admin/recruiters.vue`
- `app/pages/recruiter/dashboard.vue`
- `i18n/locales/en-GB/recruiter.json`
- `i18n/locales/en-US/recruiter.json`
