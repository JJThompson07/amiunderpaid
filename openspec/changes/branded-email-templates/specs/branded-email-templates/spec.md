## Purpose

Provides standardized, responsive, and cross-client-compatible branded HTML email templates with logo branding, primary color accents, structured data blocks, and team sign-offs for all platform transactional emails.

## ADDED Requirements

### Requirement: Standardized Branded Email Layout
The system SHALL generate responsive HTML email markup using table-based structures and inline CSS styles compatible across major email clients (Gmail, Apple Mail, Outlook). The layout MUST feature an off-white background (`#f8fafc`), a centered white card container (`#ffffff`, max-width `600px`), brand logo header, primary color accents, structured content body, and a platform footer.

#### Scenario: Rendering default AmIUnderpaid branded email
- **WHEN** an email is generated with default or AmIUnderpaid brand options
- **THEN** the rendered HTML contains the AmIUnderpaid logo (`amiunderpaid-logo.png`), uses primary teal styling (`#1cabb0`), and includes the sign-off "The Team at AmIUnderpaid".

#### Scenario: Rendering BenchmarkMyRole branded email
- **WHEN** an email is generated with BenchmarkMyRole brand options
- **THEN** the rendered HTML contains the BenchmarkMyRole logo (`benchmarkmyrole-logo.png`), uses primary orange styling (`#dd8c40`), and includes the sign-off "The Team at BenchmarkMyRole".

### Requirement: Structured Data Box Component
The email template generator SHALL provide a component for displaying structured key-value rows in a styled card container.

#### Scenario: Rendering structured candidate lead details
- **WHEN** an email is rendered with a list of lead details (such as Candidate Name, Email, Role, Location)
- **THEN** the rendered HTML outputs an inner table containing distinct labels and values with clean background shading and subtle border dividers.

### Requirement: Highlighted Credential Callout Component
The email template generator SHALL provide a prominent, secure-styled callout box for temporary credentials and security tokens.

#### Scenario: Rendering temporary password for recruiter onboarding
- **WHEN** an approval email is rendered with a temporary password
- **THEN** the rendered HTML formats the temporary password inside a monospace credential box with distinctive background highlighting and a password change reminder.

### Requirement: Call-to-Action (CTA) Button Component
The email template generator SHALL provide a bulletproof call-to-action button component.

#### Scenario: Rendering action button in transactional email
- **WHEN** an email template configuration includes a CTA button with label and target URL
- **THEN** the rendered HTML outputs a table-based button with primary brand background color, white bold text, rounded corners, and centered alignment.

### Requirement: XSS Sanitization of Email Content
The email template generator SHALL sanitize all dynamic text values (including names, roles, locations, agency names, and message bodies) against HTML injection before inserting them into HTML templates.

#### Scenario: Dynamic text contains HTML special characters
- **WHEN** input strings containing characters like `<`, `>`, `&`, `"`, or `'` are passed to the email generator
- **THEN** the rendered HTML escapes all special characters into safe HTML entity equivalents.

### Requirement: Server-Side Brand and Site-URL Resolution
The system SHALL provide a `resolveBrandFromHost(event)` helper that classifies the current Nitro request's brand (`'amiunderpaid' | 'benchmarkmyrole'`) and origin (`siteUrl`) from the request's host and protocol, for use by API routes that cannot reach the client-side `$siteBrand` plugin. Callers MUST NOT read brand or site URL from `useRuntimeConfig().public.siteUrl` for the purpose of choosing template branding or building logo/CTA links, since a single Vercel project serves all brand domains from one deployment and that value cannot represent "the current domain."

#### Scenario: Request arrives on a BenchmarkMyRole domain
- **WHEN** `resolveBrandFromHost(event)` is called during a request whose host contains `benchmarkmyrole`
- **THEN** it SHALL return `brand: 'benchmarkmyrole'` and `siteUrl` set to that request's own protocol and host

#### Scenario: Request arrives on an AmIUnderpaid domain
- **WHEN** `resolveBrandFromHost(event)` is called during a request whose host does not contain `benchmarkmyrole`
- **THEN** it SHALL return `brand: 'amiunderpaid'` and `siteUrl` set to that request's own protocol and host
