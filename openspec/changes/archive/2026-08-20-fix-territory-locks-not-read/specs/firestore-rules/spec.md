## ADDED Requirements

### Requirement: territory_category_owners access control

The system SHALL allow authenticated users to read `territory_category_owners` documents and SHALL deny all client-side writes; only server-side code (the Stripe webhook and cancellation endpoint, both using the Admin SDK) may write.

#### Scenario: Authenticated recruiter reads territory locks

- **WHEN** an authenticated user queries the `territory_category_owners` collection
- **THEN** Firestore allows the read

#### Scenario: Client attempts to write a territory lock directly

- **WHEN** any client (authenticated or not) attempts to write to a `territory_category_owners` document
- **THEN** Firestore denies the write

## REMOVED Requirements

### Requirement: territory_claims collection rule

**Reason**: `territory_claims` is no longer written by any server code path (superseded by `territory_category_owners` in Phase 4). Its rule is removed so the collection cannot be silently read once the client stops querying it, but the underlying data is retained (unwritten, unread) for a burn-in period before deletion.
**Migration**: existing `territory_claims` documents are copied into `territory_category_owners` before this rule is removed. The collection itself is deleted in a later follow-up change once the migration has burned in without incident. See `fix-territory-locks-not-read` tasks 4.1–4.4.
