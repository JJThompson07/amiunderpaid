## ADDED Requirements

### Requirement: Server-side search tracking ID generation

The system SHALL mint document IDs on the server when creating new search history records, rather than accepting client-provided IDs.

#### Scenario: Creating a new search record

- **WHEN** a client submits a new search to `/api/user/track-search`
- **THEN** the system ignores any client-provided ID, generates a new unique document ID in Firestore, and returns the generated ID to the client

### Requirement: Validated search record updates

The system SHALL ensure that search record updates explicitly target an existing document without full overwrites.

#### Scenario: Updating an existing search record

- **WHEN** a client submits an update to `/api/user/update-search` with a specific ID
- **THEN** the system updates only the specified fields on the target document without replacing the entire document
