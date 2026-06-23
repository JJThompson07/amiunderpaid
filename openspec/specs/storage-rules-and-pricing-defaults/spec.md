# storage-rules-and-pricing-defaults Specification

## Purpose
TBD - created by archiving change storage-rules-and-pricing-defaults. Update Purpose after archive.
## Requirements
### Requirement: Storage security rules configuration
The system SHALL secure recruiter logo uploads in Firebase Storage under `/recruiter_logos/{userId}/*` to allow public read access but block write access unless the user is authenticated and their `uid` matches the `{userId}` path parameter.

#### Scenario: Recruiter uploads their own logo
- **WHEN** an authenticated user attempts to upload a logo to `/recruiter_logos/{userId}/logo.png` with their `uid` equal to `{userId}`
- **THEN** the system SHALL allow the write operation.

#### Scenario: Unauthenticated user attempts to upload logo
- **WHEN** an unauthenticated user attempts to upload a logo to `/recruiter_logos/{userId}/logo.png`
- **THEN** the system SHALL deny the write operation.

### Requirement: Stripe checkout pricing fallback
The Stripe checkout backend route SHALL fall back to a default pricing configuration if the `platform_settings/pricing` document is not present in Firestore, instead of returning a 500 error.

#### Scenario: Checkout session created when database pricing document is missing
- **WHEN** a checkout session is requested and `platform_settings/pricing` does not exist in Firestore
- **THEN** the system SHALL successfully construct the checkout session using the default pricing values (e.g. Band 1 basic UK price = 50 GBP, Band 1 basic USA price = 60 USD).

### Requirement: Stripe cancellation pricing fallback
The Stripe territory cancellation backend route SHALL fall back to the default pricing configuration if the `platform_settings/pricing` document is not present in Firestore.

#### Scenario: Territory cancellation requested when database pricing document is missing
- **WHEN** a cancellation request is processed and `platform_settings/pricing` does not exist in Firestore
- **THEN** the system SHALL successfully calculate the updated subscription amount using default pricing values.

