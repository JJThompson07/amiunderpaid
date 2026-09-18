# Spec Delta: firestore-rules

## MODIFIED Requirements

### Requirement: User profile write restrictions

The system SHALL allow users to update their own profile, but MUST NOT allow them to modify restricted fields (`role`, `status`, `activeTerritories`, `basicDiscount`, `exclusiveDiscount`, `stripeSubscriptionId`, `ukNationalStatus`, `usaNationalStatus`, `claims`).

#### Scenario: User updates allowed fields

- **WHEN** an authenticated user updates their own profile's `name` or `agency_name`
- **THEN** Firestore allows the update

#### Scenario: User attempts to escalate privileges

- **WHEN** an authenticated user attempts to update their own profile's `role` to `admin`
- **THEN** Firestore denies the update

#### Scenario: User attempts to self-grant UK national recruiter tier

- **WHEN** an authenticated user attempts to update their own profile document with `ukNationalStatus: 'active'` via client SDK `updateDoc`
- **THEN** Firestore denies the write

#### Scenario: User attempts to self-grant USA national recruiter tier

- **WHEN** an authenticated user attempts to update their own profile document with `usaNationalStatus: 'active'` via client SDK `updateDoc`
- **THEN** Firestore denies the write

#### Scenario: User attempts to self-grant territory claims

- **WHEN** an authenticated user attempts to create or update their own profile document with `claims` via client SDK
- **THEN** Firestore denies the write

### Requirement: Strict profile field protection

The system SHALL prevent users from creating or updating sensitive fields on their own profile without administrative privileges.

#### Scenario: User tries to discount their price

- **WHEN** a user tries to set `exclusiveDiscount` via `updateDoc`
- **THEN** Firestore denies the request

#### Scenario: Admin updates protected recruiter fields

- **WHEN** an authenticated administrator updates a recruiter's `ukNationalStatus`, `usaNationalStatus`, `basicDiscount`, or `role`
- **THEN** Firestore allows the write
