## ADDED Requirements

### Requirement: Recruiter rejection notification email

When an admin rejects a recruiter access request, the system SHALL queue a notification email to the applicant's email address informing them that their application was unsuccessful.

#### Scenario: Admin rejects a pending access request

- **WHEN** an admin POSTs to `/api/admin/recruiters/reject` with a valid `uid`
- **THEN** the system SHALL update the Firestore document status to `rejected` AND queue a `mail` document to the recruiter's email address with a rejection message

### Requirement: Recruiter approval email is multi-tenant aware

The approval email sent by `accept.post.ts` SHALL use a configurable base URL rather than a hardcoded domain, so the correct login link is sent for each deployment (amiunderpaid.co.uk, amiunderpaid.com, benchmarkmyrole.com).

#### Scenario: Admin accepts a recruiter on the BMR deployment

- **WHEN** an admin approves a recruiter and the server's `NUXT_PUBLIC_SITE_URL` runtime config is `https://www.benchmarkmyrole.com`
- **THEN** the approval email login link SHALL point to `https://www.benchmarkmyrole.com/recruiter/login`
