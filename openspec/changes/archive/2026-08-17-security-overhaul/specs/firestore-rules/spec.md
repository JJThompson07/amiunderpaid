## Purpose

Establishes a deny-by-default security posture for Firestore and restricts client-side writes to prevent role escalation and unauthorized data manipulation.

## ADDED Requirements

### Requirement: Global deny-by-default rule

The system SHALL deny all read and write access to all Firestore documents by default.

#### Scenario: Unauthorized access attempt

- **WHEN** any user attempts to read or write a document not explicitly allowed
- **THEN** Firestore denies the operation

### Requirement: User profile access control

The system SHALL allow users to read their own user profile document, and admins to read all user profile documents.

#### Scenario: User reads own profile

- **WHEN** an authenticated user attempts to read their own document in the `users` collection
- **THEN** Firestore allows the read

#### Scenario: User reads another profile

- **WHEN** an authenticated user attempts to read another user's document in the `users` collection
- **THEN** Firestore denies the read

### Requirement: User profile write restrictions

The system SHALL allow users to update their own profile, but MUST NOT allow them to modify restricted fields (e.g., `role`, `status`, `activeTerritories`, `basicDiscount`).

#### Scenario: User updates allowed fields

- **WHEN** an authenticated user updates their own profile's `name` or `company`
- **THEN** Firestore allows the update

#### Scenario: User attempts to escalate privileges

- **WHEN** an authenticated user attempts to update their own profile's `role` to `admin`
- **THEN** Firestore denies the update

### Requirement: Platform settings are read-only to clients

The system SHALL allow all users to read the `platform_settings` collection, but deny all client-side writes.

#### Scenario: Client reads pricing settings

- **WHEN** a client fetches the current territory pricing from `platform_settings`
- **THEN** Firestore allows the read

#### Scenario: Client attempts to alter pricing

- **WHEN** a client attempts to modify a document in `platform_settings`
- **THEN** Firestore denies the write
