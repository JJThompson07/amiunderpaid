## REMOVED Requirements

### Requirement: territory_category_owners access control

**Reason**: No client reads territory locks after the recruiter product is removed.

**Migration**: Replaced by "Retired recruiter collections are server-only" below.

## ADDED Requirements

### Requirement: Retired recruiter collections are server-only

`territory_category_owners`, `leads` and `recruiter_contact_settings` MUST deny all client reads and writes while their data is retained for the burn-in period.

#### Scenario: Client reads a retired collection

- **WHEN** an authenticated client queries `territory_category_owners`
- **THEN** Firestore denies the read
