## ADDED Requirements

### Requirement: territory_claims locks released on cancellation

When a recruiter cancels a territory, the system SHALL atomically remove the cancelled user's exclusive month entries from the `territory_claims` Firestore document in the same server-side operation that updates the user's `activeTerritories` array.

#### Scenario: Recruiter cancels a territory with exclusive months

- **WHEN** a recruiter cancels a territory that has one or more `exclusiveMonths`
- **THEN** the server SHALL use a Firestore batch write to (a) remove the cancelled months from `territory_claims.takenExclusiveMonths` using `FieldValue.delete()` for each month key, (b) delete the `territory_claims` document entirely if `takenExclusiveMonths` becomes empty, and (c) update the user's `activeTerritories` array — all in a single atomic commit

#### Scenario: Another recruiter can claim a previously cancelled exclusive month

- **WHEN** recruiter A cancels an exclusive month that was previously locked, and recruiter B subsequently opens the territory matrix
- **THEN** the cancelled month SHALL appear as available (not locked) in recruiter B's schedule matrix

### Requirement: Cancel flow does not perform optimistic local mutation

The recruiter dashboard cancel handler SHALL NOT mutate `userProfile.value.activeTerritories` directly after a successful API call. The real-time Firestore listener SHALL be the sole source of truth for the UI state after cancellation.

#### Scenario: Recruiter cancels a territory and the UI updates

- **WHEN** the cancel API call resolves successfully
- **THEN** the territory card SHALL disappear from the dashboard within 1 second, driven by the real-time Firestore listener, without any intermediate flicker caused by optimistic mutation

### Requirement: Checkout submission errors use toast notification

When the Stripe checkout creation API call fails on the territories page, the system SHALL display an error using the platform's `useSystemToast` composable rather than a blocking `window.alert()` call.

#### Scenario: Checkout API returns an error

- **WHEN** `/api/stripe/create-checkout` returns a non-200 response
- **THEN** an error toast SHALL appear with a user-friendly message; no `alert()` dialog SHALL be shown

### Requirement: Profile save errors use toast notification

When `saveProfileCategories` fails on the recruiter profile page, the system SHALL display an error toast rather than a blocking `alert()` dialog.

#### Scenario: Profile categories save fails

- **WHEN** the `updateProfile` call in `saveProfileCategories` throws an error
- **THEN** an error toast SHALL appear; no `alert()` dialog SHALL be triggered

### Requirement: Territory selection limit warning

When a recruiter selects more than 10 territories simultaneously, the `useTerritoryClaims` composable SHALL expose a `claimsLimitExceeded` reactive boolean set to `true`, and the territories page SHALL display a visible warning to the user that lock data may be incomplete beyond 10 territories.

#### Scenario: Recruiter selects 11 or more territories

- **WHEN** `territoryIds.value.length > 10`
- **THEN** `claimsLimitExceeded` SHALL be `true` and the UI SHALL render a visible warning banner on the schedule matrix step

### Requirement: Direct recruiter signup path is removed or gated

The `signup()` function in `useRecruiterAuth.ts` SHALL NOT be callable from any active UI route. The recruiter registration flow MUST go exclusively through the Request Access modal → admin approval → one-time password email pathway.

#### Scenario: Recruiter attempts to access a direct signup form

- **WHEN** a user navigates to any route that previously rendered a signup form using `signup()`
- **THEN** the route SHALL either not exist or redirect to the Request Access flow
