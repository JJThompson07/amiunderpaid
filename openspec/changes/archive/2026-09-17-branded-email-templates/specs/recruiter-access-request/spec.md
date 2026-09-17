## MODIFIED Requirements

### Requirement: Recruiter access request submission

The system SHALL provide a public-facing "Request Access" form on the recruiter login page that captures the candidate agency name and email. The system SHALL also resolve the requesting brand and origin via `resolveBrandFromHost(event)` and persist them on the created document as `site` (`'amiunderpaid' | 'benchmarkmyrole'`) and `siteUrl` (string), so a later approval or rejection can be branded and linked correctly regardless of which domain an administrator is acting from.

#### Scenario: Successful access request submission

- **WHEN** a user enters a valid name and email in the "Request Access" form and submits it
- **THEN** the system SHALL create a document in the `users` Firestore collection with `role` set to "recruiter", `status` set to "requested", the provided name and email, `site` set to the resolved brand, and `siteUrl` set to the resolved origin, and show a success confirmation message

### Requirement: Recruiter approval email is multi-tenant aware

The approval email sent by `accept.post.ts` SHALL use the brand and site URL persisted on the recruiter's `users` document (`data.site` / `data.siteUrl`, written at request-access time) rather than a single shared runtime config value, so the correct logo, styling, and login link are sent regardless of which of the three domains (amiunderpaid.co.uk, amiunderpaid.com, benchmarkmyrole.com) the recruiter originally applied from. This repo is a single Vercel project serving all three domains from one deployment, so `NUXT_PUBLIC_SITE_URL` cannot vary "per deployment" as previously assumed. For any pre-existing document created before this field existed, the system SHALL fall back to `brand: 'amiunderpaid'` and `siteUrl: config.public.siteUrl`.

#### Scenario: Admin accepts a recruiter on the BMR deployment

- **WHEN** an admin approves a recruiter whose `users` document has `site: 'benchmarkmyrole'` and `siteUrl: 'https://www.benchmarkmyrole.com'`
- **THEN** the approval email SHALL use the BenchmarkMyRole logo and orange primary color, and the login link SHALL point to `https://www.benchmarkmyrole.com/recruiter/login`

#### Scenario: Admin accepts a recruiter whose request predates brand persistence

- **WHEN** an admin approves a recruiter whose `users` document has neither `site` nor `siteUrl`
- **THEN** the approval email SHALL use the AmIUnderpaid brand and the `config.public.siteUrl` login link, matching prior behavior

### Requirement: Recruiter rejection notification email

When an admin rejects a recruiter access request, the system SHALL queue a notification email to the applicant's email address informing them that their application was unsuccessful, branded using the `data.site` persisted on the recruiter's `users` document at request-access time (falling back to `'amiunderpaid'` if absent).

#### Scenario: Admin rejects a pending access request

- **WHEN** an admin POSTs to `/api/admin/recruiters/reject` with a valid `uid`
- **THEN** the system SHALL update the Firestore document status to `rejected` AND queue a `mail` document to the recruiter's email address with a rejection message rendered using the brand from `data.site`
