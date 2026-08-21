## MODIFIED Requirements

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
