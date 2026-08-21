# Analytics Tracking

## Purpose

Track user sessions and search activities for analytical purposes.

## Requirements

### Requirement: Session Tracking on Mount

The system SHALL track a user session precisely once per day when they mount the app.

#### Scenario: Client connects

- **WHEN** the application mounts on the client and is not in development mode
- **THEN** it checks local storage to ensure a session hasn't been logged today, and if not, logs it to `/api/analytics/session`

### Requirement: Process Session Data

The system SHALL aggregate session analytics by country and city in Firestore.

#### Scenario: Aggregating session location

- **WHEN** a session is logged to `/api/analytics/session`
- **THEN** it increments the total session count and the location-specific count for the current day based on headers.

### Requirement: Admin Analytics View

The system SHALL provide an interface for administrators to view session analytics.

#### Scenario: Admin views sessions

- **WHEN** an admin navigates to `/admin/sessions`
- **THEN** they can view a table of session dates, location breakdowns, and total counts.

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

### Requirement: Authenticated analytics updates

The system SHALL require a valid HMAC signature to update search history records. The HMAC SHALL be signed and verified with a dedicated `searchTokenSecret`, registered in private `runtimeConfig` with no committed fallback value, distinct from any secret used for another purpose (e.g. the Stripe webhook signing secret). If `searchTokenSecret` is not configured, the endpoints that sign or verify these tokens SHALL fail closed with a 500 rather than defaulting to a literal value. Signature comparison SHALL use a timing-safe comparison.

#### Scenario: Invalid signature on search update

- **WHEN** a client submits a search history update with an invalid or missing token
- **THEN** the system rejects the update with a 403 Forbidden

#### Scenario: Search token secret is not configured

- **WHEN** `searchTokenSecret` is unset in the running environment
- **THEN** `track-search` and `update-search` fail closed with a 500 rather than signing or verifying with a default literal

#### Scenario: Token comparison resists timing analysis

- **WHEN** the system verifies a submitted token against the expected HMAC
- **THEN** it uses a constant-time comparison (`crypto.timingSafeEqual`) rather than a variable-time string comparison
