## ADDED Requirements

### Requirement: Specific errors are not masked by generic failures

The system SHALL propagate an already-classified error raised while processing a lead submission (e.g. a 404 for a recruiter id that does not exist) to the client with its original status code, rather than converting it into a generic 500 in an outer error handler.

#### Scenario: Lead submitted for a nonexistent recruiter

- **WHEN** a lead is submitted with a `recruiterId` that has no corresponding document in the `users` collection
- **THEN** the system responds with a 404 status, not a 500

#### Scenario: An unexpected failure occurs while processing a valid recruiter

- **WHEN** an unclassified error (e.g. a Firestore write failure) occurs while processing a lead for a `recruiterId` that does exist
- **THEN** the system responds with an opaque 500 status per the existing error-message rules, without leaking provider or infrastructure details
