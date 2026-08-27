## Purpose

Requires recruiters to accept the platform's Terms & Conditions before completing a territory purchase or upgrade, and lets them accept independently from their profile. Records acceptance against a specific Terms version so a future material change can require re-acceptance.

## ADDED Requirements

### Requirement: Acceptance is recorded per version

The system SHALL store `termsAcceptedAt` (an ISO timestamp) and `termsAcceptedVersion` (matching the currently-in-force Terms version) on the recruiter's `users/{uid}` document when they accept.

#### Scenario: Recruiter accepts for the first time

- **WHEN** a recruiter with no prior `termsAcceptedVersion` accepts the Terms (via checkout or their profile)
- **THEN** `termsAcceptedAt` and `termsAcceptedVersion` are written to their user document, with `termsAcceptedVersion` equal to the current version

#### Scenario: Terms are updated to a new version

- **WHEN** the platform's Terms content is updated and `CURRENT_TERMS_VERSION` changes
- **THEN** a recruiter whose stored `termsAcceptedVersion` no longer matches is treated as not having accepted the current Terms, and must accept again

### Requirement: Checkout is blocked until the current Terms are accepted

The checkout endpoint (`/api/stripe/create-checkout`) SHALL reject the request if the recruiter's `termsAcceptedVersion` does not match `CURRENT_TERMS_VERSION`, independent of any client-side checkbox state.

#### Scenario: Recruiter has not accepted and attempts checkout

- **WHEN** a recruiter whose `termsAcceptedVersion` does not match the current version submits a checkout or upgrade request
- **THEN** the server returns a 403 and does not create a Stripe Checkout session, regardless of what the client sent

#### Scenario: Client-side gate is bypassed

- **WHEN** a recruiter circumvents the disabled checkout button client-side (e.g. via browser devtools) without having accepted the current Terms
- **THEN** the server-side check in `create-checkout.post.ts` still rejects the request with a 403

### Requirement: Acceptance UI is only shown when needed

The recruiter-facing Terms acceptance checkbox SHALL only render when the recruiter has not yet accepted the current Terms version. Once accepted, the same location SHALL show a confirmation of when they accepted, not the checkbox.

#### Scenario: Recruiter has already accepted the current Terms

- **WHEN** a recruiter whose `termsAcceptedVersion` matches `CURRENT_TERMS_VERSION` visits the territories claim page, the territory upgrade page, or their profile
- **THEN** no acceptance checkbox is shown on any of those pages

#### Scenario: Recruiter has not yet accepted

- **WHEN** a recruiter without a matching `termsAcceptedVersion` visits the territories claim page, the territory upgrade page, or their profile
- **THEN** an acceptance checkbox is shown, alongside a clickable link to view the full Terms in a modal

### Requirement: Checkout submission is blocked until the checkbox is checked

On the territories claim page and the territory upgrade page, the final submission button SHALL remain disabled until the recruiter either has already accepted the current Terms, or has checked the acceptance checkbox in that session.

#### Scenario: Unaccepted recruiter has not checked the box

- **WHEN** a recruiter who has not accepted the current Terms has not checked the acceptance checkbox
- **THEN** the finalize/upgrade button is disabled, independent of whether their cart/schedule selections are otherwise valid

#### Scenario: Unaccepted recruiter checks the box then submits

- **WHEN** such a recruiter checks the acceptance checkbox and their cart/schedule selections are valid
- **THEN** the finalize/upgrade button becomes enabled, and submitting it records their acceptance before the checkout request is sent

### Requirement: Terms can be accepted independently from the profile page

Recruiters SHALL be able to accept the current Terms from their profile page at any time, without needing to be mid-checkout.

#### Scenario: Recruiter accepts from their profile

- **WHEN** a recruiter checks the acceptance checkbox on their profile page and confirms
- **THEN** `termsAcceptedAt` and `termsAcceptedVersion` are recorded, and the checkbox no longer appears on the profile page, the territories claim page, or the territory upgrade page
