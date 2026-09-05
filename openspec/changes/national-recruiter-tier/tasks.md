## 1. Core Models
- [ ] 1.1 In `shared/utils/types.ts`, add `isUkNational?: boolean;` and `isUsaNational?: boolean;` to `UserProfile`.

## 2. Search Aggregation (`recruiter-card.get.ts`)
- [ ] 2.1 In `server/api/user/search/recruiter-card.get.ts`, remove the early return block: `if (!claimSnap.exists) { return { success: true, cards: [] }; }`.
- [ ] 2.2 After fetching the local `claimData` (if it exists), determine the target national flag: `const targetFlag = territoryId < 200 ? 'isUkNational' : 'isUsaNational';`.
- [ ] 2.3 Execute a live query: `await db.collection('users').where(targetFlag, '==', true).where('coveredCategories', 'array-contains', category).limit(10).get();`
- [ ] 2.4 Merge the resulting UIDs from the live query into the local `basicOwners` array, deduping via `new Set()`, before the existing basic-owner shuffle logic.
- [ ] 2.5 Update `server/api/user/search/tests/recruiter-card.spec.ts` with new test cases covering the merged query and the removed early-return.

## 3. Pricing Updates
- [ ] 3.1 In `server/api/stripe/create-checkout.post.ts`, locate the `newMonthlyTotal` loop. After it completes, add the flat Band 1 basic price (minus `basicDiscount`) once per active flag if `userData.isUkNational` or `userData.isUsaNational` is true — this is a flat once-per-flag charge, not a per-territory amount, so it must not be added inside the per-territory loop.
- [ ] 3.2 Repeat the exact same logic in `server/api/stripe/cancel-territory.post.ts`: add the flat national charge as a single unconditional addition to `newMonthlyTotal` after its per-territory `forEach` loop completes (it is a flat once-per-flag charge, not a per-territory amount — do not add it inside the `forEach`).
- [ ] 3.3 Add test assertions for national total calculations in both `cancel-territory.spec.ts` and `create-checkout.spec.ts`.

## 4. Admin API Endpoint
- [ ] 4.1 Create `server/api/admin/recruiters/set-national.post.ts`. Accepts `uid`, `country` ('UK' or 'USA'), and `active` (boolean).
- [ ] 4.2 If `active` is true: Filter the user's `activeTerritories` to find every local claim matching the target country, then for EACH matching claim, surgically clean up its `territory_category_owners/{territoryId}_{categoryValue}` doc by mirroring the pattern in `cancel-territory.post.ts` (~lines 150-210) — remove only this uid from `basicOwners` via `FieldValue.arrayRemove`, remove only this uid's entries from `takenExclusiveMonths`, and delete the doc only if it ends up with no remaining basic owners or taken months. Do NOT blanket-delete these docs: other recruiters may hold their own basic ownership or exclusive months on the same territory+category doc, and must be left untouched. Then remove the matching claims from `activeTerritories` and set `isUkNational` or `isUsaNational` to true.
- [ ] 4.3 If `active` is false: Set the corresponding flag to false. Do not restore old local territories.
- [ ] 4.4 Run the Stripe subscription update logic (reusing the accurate total calculation) and save the user.
- [ ] 4.5 Add >80% coverage unit tests for `set-national.post.ts`.

## 5. UI Updates
- [ ] 5.1 In `app/pages/admin/recruiters.vue`, add UI controls (e.g., a toggle or modal) to trigger the `set-national` endpoint for UK and USA.
- [ ] 5.2 In `app/pages/recruiter/dashboard.vue`, read the user's profile. If `isUkNational` or `isUsaNational` is true, render a distinct banner/badge indicating their national coverage.
- [ ] 5.3 Add the necessary i18n strings for the new recruiter dashboard banner to the `dashboard` namespace already present in `i18n/locales/en-GB/recruiter.json`, AND mirror the same keys in `i18n/locales/en-US/recruiter.json` (this repo is dual-tenant; `app/locales/en.json` does not exist).

## 6. Manual Pre-Deploy Step
- [ ] 6.1 **MANUAL ADMIN ACTION REQUIRED:** Before deploying, manually create the required composite index in the Firebase Console: Collection `users`, Fields `isUkNational` (Ascending) + `coveredCategories` (Arrays), and another for `isUsaNational` (Ascending) + `coveredCategories` (Arrays).

## 7. Verification
- [ ] 7.1 Run the full verification suite (`pnpm test:verify`) to ensure zero regressions and maintain 80% coverage.
