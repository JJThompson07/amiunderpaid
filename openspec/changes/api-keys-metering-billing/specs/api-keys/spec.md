## ADDED Requirements

### Requirement: Keys are shown once and stored only as a peppered hash

An API key MUST be generated from at least 32 cryptographically random bytes with the prefix `bmr_live_`, MUST be shown to the user exactly once at creation, and MUST be stored only as an HMAC with a server-held secret. The raw key MUST NOT be persisted or logged anywhere.

#### Scenario: Viewing keys later

- **WHEN** a user opens their dashboard after creating a key
- **THEN** the key is shown only as its prefix and last 4 characters

#### Scenario: Database export

- **WHEN** an attacker obtains a copy of the `api_keys` collection but not the server secret
- **THEN** no stored value can be presented as a working key

### Requirement: Authentication by bearer key

Every v1 data endpoint MUST require `Authorization: Bearer <key>` and MUST respond 401 `invalid_api_key` for a missing, malformed, unknown or revoked key.

#### Scenario: Revoked key

- **WHEN** a key was revoked more than 60 seconds ago and is then used
- **THEN** the response is 401 `invalid_api_key`

#### Scenario: Duplicate revocation

- **WHEN** the same key is revoked twice
- **THEN** the user's active key count drops by exactly one and never goes below zero

#### Scenario: Flood of invalid keys

- **WHEN** a client sends many requests, each with a different random key
- **THEN** every request gets 401 `invalid_api_key` and the server's key caches never exceed their fixed maximum entry count

### Requirement: Key issuance limits

A user MUST have a verified email to create a key, and SHALL NOT hold more than 5 non-revoked keys at once.

#### Scenario: Sixth key

- **WHEN** a user with 5 active keys requests another
- **THEN** the request is refused with a 400 explaining the limit and no key is created

#### Scenario: Unverified email

- **WHEN** a user whose email is not verified requests a key
- **THEN** the request is refused with a 403 and no key is created
