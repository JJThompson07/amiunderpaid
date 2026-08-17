## ADDED Requirements

### Requirement: Authenticated analytics updates
The system SHALL require a valid HMAC signature to update search history records.

#### Scenario: Invalid signature on search update
- **WHEN** a client submits a search history update with an invalid or missing token
- **THEN** the system rejects the update with a 403 Forbidden
