## MODIFIED Requirements

### Requirement: territory_category_owners locks released on cancellation

When a recruiter cancels a territory, the system SHALL atomically remove the cancelled user's exclusive month entries from the `territory_category_owners` Firestore document in the same server-side operation that updates the user's `activeTerritories` array.

#### Scenario: Recruiter cancels a territory with exclusive months

- **WHEN** a recruiter cancels a territory that has one or more `exclusiveMonths`
- **THEN** the server SHALL use a Firestore batch write to (a) remove the cancelled months from `territory_category_owners.takenExclusiveMonths` using `FieldValue.delete()` for each month key, (b) delete the `territory_category_owners` document entirely if `takenExclusiveMonths` and `basicOwners` both become empty, and (c) update the user's `activeTerritories` array — all in a single atomic commit

#### Scenario: Another recruiter can claim a previously cancelled exclusive month

- **WHEN** recruiter A cancels an exclusive month that was previously locked, and recruiter B subsequently opens the territory matrix
- **THEN** the cancelled month SHALL appear as available (not locked) in recruiter B's schedule matrix

## ADDED Requirements

### Requirement: Client availability query reads the live lock collection

The client-side territory availability query (`useTerritoryClaims`) SHALL read from the same Firestore collection that the Stripe webhook and cancellation endpoints write locks to. Whenever the server-side lock collection changes, the client query SHALL be updated in the same change.

#### Scenario: Recruiter opens the territory purchase matrix

- **WHEN** a recruiter loads the territory schedule matrix
- **THEN** `useTerritoryClaims` SHALL query `territory_category_owners` and any month present in `takenExclusiveMonths` for a selected territory, owned by another recruiter, SHALL render as locked

#### Scenario: Lock written by the webhook is immediately visible to the client query

- **WHEN** the Stripe webhook fulfils a purchase and writes a new exclusive-month lock to `territory_category_owners`
- **THEN** a subsequent `useTerritoryClaims` query for that territory SHALL resolve the month as taken
