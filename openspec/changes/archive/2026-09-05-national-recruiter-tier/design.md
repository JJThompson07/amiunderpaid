## Overview

This architecture abandons the pseudo-territory approach in favor of explicit profile-level boolean flags, securing the tier from self-service checkout flows and accurately mirroring the product requirements.

## Key Decisions

**1. Data Model**

- _Decision_: Inject `isUkNational` and `isUsaNational` directly onto `UserProfile`.
- _Rationale_: Exposing a fake territory ID in `RECRUITER_TERRITORIES_UK` would allow recruiters to purchase national coverage via the self-service wizard. A standalone boolean prevents this entirely.

**2. Search-Time Lookup**

- _Decision_: Execute a live `users` collection query during `recruiter-card.get.ts`.
- _Rationale_: A denormalized index (`999_category`) goes instantly stale because `coveredCategories` is self-service editable. Querying the live `users` collection with `.where('isUkNational', '==', true).where('coveredCategories', 'array-contains', category)` ensures absolute accuracy.
- _Constraint_: We must remove the existing `if (!claimSnap.exists) return { success: true, cards: [] }` short-circuit so the national query can run even if no local territories have been claimed.

**3. Pricing Calculation**

- _Decision_: Inject the flat-rate national math into both `cancel-territory.post.ts` and `create-checkout.post.ts`.
- _Rationale_: If a recruiter holds a national flag and adds/removes a _different_ local territory (e.g. they have UK National, but buy a local USA territory), the total monthly calculation loop must inherently know to preserve the UK National charge.

**4. Symmetrical Admin Revoke**

- _Decision_: Revoking national coverage leaves the recruiter with zero local coverage in that country.
- _Rationale_: Simplest and most predictable state machine. If they lose national, they go back to the standard self-serve wizard to purchase local territories.

**5. UI Placements**

- _Decision_: A dedicated badge/banner on `app/pages/recruiter/dashboard.vue`, not a row in the matrix.
- _Rationale_: National is a profile state, not a cancelable territory claim. It does not belong in the editable `TerritoryDashboardMatrix`.

**6. Dual-Flag Currency Edge Case**

- _Known limitation_: A recruiter could hold `isUkNational: true` and `isUsaNational: true` simultaneously, but billing runs through a single `billingCountry`/currency per subscription. This is not a new regression — `cancel-territory.post.ts` and `create-checkout.post.ts` already price every entry in `activeTerritories` off the single `billingCountry` pricing table today, even for a recruiter holding local territories in both countries. This proposal inherits that existing simplification rather than fixing it; flagged here so it's a conscious choice, not an oversight.
