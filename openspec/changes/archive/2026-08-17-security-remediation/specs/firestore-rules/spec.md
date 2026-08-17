## ADDED Requirements

### Requirement: Full collection coverage
The system SHALL explicitly deny access to all collections not explicitly granted by rule.

#### Scenario: Client accesses undocumented collection
- **WHEN** a client attempts to read `search_history` directly
- **THEN** Firestore denies the request

### Requirement: Strict profile field protection
The system SHALL prevent users from updating sensitive fields on their own profile.

#### Scenario: User tries to discount their price
- **WHEN** a user tries to set `exclusiveDiscount` via `updateDoc`
- **THEN** Firestore denies the request
