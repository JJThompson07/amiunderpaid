## ADDED Requirements

### Requirement: Resilient National Billing Synchronization

The admin national tier endpoint (`server/api/admin/recruiters/set-national.post.ts`) SHALL detect when a recruiter's Stripe subscription is missing, deleted, or in a `canceled` status in Stripe, clearing the stale `stripeSubscriptionId` and completing Firestore status updates without throwing an unhandled billing error.

#### Scenario: Revoking national status when Stripe subscription was deleted

- **GIVEN** a recruiter holds `ukNationalStatus: 'active'` with a `stripeSubscriptionId` that no longer exists or is canceled in Stripe
- **WHEN** an admin revokes the national status (`active: false`)
- **THEN** the system SHALL clear `stripeSubscriptionId: null`, clear `ukNationalStatus`, and commit the Firestore updates successfully without returning a 500 error.

#### Scenario: Granting national status when Stripe subscription was deleted

- **GIVEN** a recruiter holds a `stripeSubscriptionId` that no longer exists or is canceled in Stripe
- **WHEN** an admin grants national status (`active: true`)
- **THEN** the system SHALL clear `stripeSubscriptionId: null`, set the national status to `'pending'`, and return success so the recruiter can complete checkout to activate.
