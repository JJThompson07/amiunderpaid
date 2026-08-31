# leads-relay-security Specification

## Purpose

Secures the recruiter lead submission endpoint against email injection and HTML phishing payloads.

## Requirements

### Requirement: Email recipient format validation

The system SHALL strictly validate that the recipient email address provided in a lead submission conforms to a standard email format before processing.

#### Scenario: Valid email format

- **WHEN** a lead is submitted with `email: "recruiter@example.com"`
- **THEN** the system accepts the submission and queues the email

#### Scenario: Invalid email format

- **WHEN** a lead is submitted with an invalid email format (e.g., missing `@` or domain)
- **THEN** the system rejects the request with a 400 Bad Request error

### Requirement: HTML sanitization of lead inputs

The system SHALL sanitize all user-provided inputs (e.g., name, role, location) before interpolating them into the HTML email template.

#### Scenario: Malicious HTML injection attempt

- **WHEN** a user submits a lead with a name containing HTML tags (e.g., `Bob <a href="http://evil.com">Click</a>`)
- **THEN** the system escapes the HTML entities so they render as plain text in the resulting email, preventing phishing attacks

### Requirement: Safe agency names

The system SHALL sanitize the agency name before interpolating it into email templates.

#### Scenario: Malicious agency name

- **WHEN** an agency name contains HTML tags like `<script>`
- **THEN** the system escapes the characters in the outbound email

### Requirement: Specific errors are not masked by generic failures

The system SHALL propagate an already-classified error raised while processing a lead submission (e.g. a 404 for a recruiter id that does not exist) to the client with its original status code, rather than converting it into a generic 500 in an outer error handler.

#### Scenario: Lead submitted for a nonexistent recruiter

- **WHEN** a lead is submitted with a `recruiterId` that has no corresponding document in the `users` collection
- **THEN** the system responds with a 404 status, not a 500

#### Scenario: An unexpected failure occurs while processing a valid recruiter

- **WHEN** an unclassified error (e.g. a Firestore write failure) occurs while processing a lead for a `recruiterId` that does exist
- **THEN** the system responds with an opaque 500 status per the existing error-message rules, without leaking provider or infrastructure details
