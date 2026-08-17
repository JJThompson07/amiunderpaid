## ADDED Requirements

### Requirement: Safe agency names
The system SHALL sanitize the agency name before interpolating it into email templates.

#### Scenario: Malicious agency name
- **WHEN** an agency name contains HTML tags like `<script>`
- **THEN** the system escapes the characters in the outbound email
