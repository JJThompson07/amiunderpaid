## Purpose

Define the authorized procedure for granting the admin custom claim to user accounts.

## ADDED Requirements

### Requirement: Secure admin claim granting

The system SHALL provide a documented CLI script or secure endpoint to grant the `admin: true` claim to an account.

#### Scenario: Bootstrapping a new admin

- **WHEN** an operator runs the `grant-admin.ts` script with a valid uid
- **THEN** the system sets the custom claim and updates the user document role to admin
