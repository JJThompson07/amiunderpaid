## Why

Outbound customer- and recruiter-facing emails (such as candidate lead notifications, candidate confirmation receipts, recruiter access approval credentials, and application rejections) currently use raw, unstyled HTML strings (`<h2>`, `<p>`). These emails appear bare and unpolished, lack visual brand identity (no logo or primary color styling), and risk inconsistent rendering across email clients (Gmail, Apple Mail, Outlook). Upgrading outbound communications to responsive, beautifully styled HTML templates with official logos, AmI primary colors (`#1cabb0`), highlighted data cards, call-to-action buttons, and professional sign-offs from "The Team at AmIUnderpaid" will significantly elevate platform trust and brand credibility.

## What Changes

- **1. Server-Side Branded Email Template Utility (`server/utils/emailTemplate.ts`)**:
  - Create a reusable, cross-client-compatible HTML email builder function `renderBrandedEmail()`.
  - Include the brand logo (`/amiunderpaid-logo.png` / `/benchmarkmyrole-logo.png`, resolved from an explicit `siteUrl` argument — never `config.public.siteUrl` internally; see "Brand & Site-URL Resolution" below), responsive container with off-white backdrop (`#f8fafc`), and a crisp white content card (`#ffffff`) with subtle borders and primary color accents.
  - Apply the **AmI primary color palette** (Primary Teal `#1cabb0`, Dark Slate `#0f172a`, Muted Text `#475569`, Accent Borders `#e2e8f0`).
  - Provide reusable helper components:
    - **Highlight Data Boxes**: Clean summary tables for structured details (e.g. candidate name/role/location or temporary login credentials).
    - **Call-to-Action (CTA) Buttons**: Bulletproof, styled pill buttons with primary teal background and bold white text.
    - **Professional Sign-Off**: Consistent sign-off ("Best regards,\nThe Team at AmIUnderpaid" / "The Team at BenchmarkMyRole").
    - **Footer**: Brand links, support info, and copyright notice.
  - Add `resolveBrandFromHost(event)`, a server-only helper that classifies the current request's brand and origin from `getRequestHost(event)` / `getRequestProtocol(event)` (mirroring the hostname check already used client-side in `app/plugins/tenant.ts`). This exists because Nitro API routes (`server/api/**`) cannot reach the Vue-layer `$siteBrand` plugin, and because this repo is a **single Vercel project** serving `www.amiunderpaid.co.uk`, `www.amiunderpaid.com`, and `www.benchmarkmyrole.com` off one deployment (confirmed via the Vercel project's domain list) — so a single static `config.public.siteUrl` cannot represent "the current domain" for any of them.

- **2. Recruiter Lead Notification & Candidate Receipt (`server/api/user/leads/submit.post.ts`)**:
  - **Recruiter Lead Email**: Formatted with a structured candidate overview card (Name, Email, Role, Location) and a direct "View Lead in Dashboard" CTA button.
  - **Candidate Confirmation Email**: Formatted with a reassuring summary acknowledging that their inquiry has been forwarded to the partner agency.
  - Brand and site URL for both emails are resolved via `resolveBrandFromHost(event)` from the inbound request, since `LeadContact.vue` (the form that posts here) is rendered on both AmIUnderpaid (`salary/...`) and BenchmarkMyRole (`benchmark/...`) pages.

- **3. Recruiter Onboarding & Application Emails (`server/api/user/recruiter/request-access.post.ts`, `server/api/admin/recruiters/`)**:
  - **Access Request (`request-access.post.ts`)**: Resolves `{ brand, siteUrl }` via `resolveBrandFromHost(event)` at submission time (recruiters apply from `recruiter/login.vue` under either brand) and persists both as new `site` / `siteUrl` fields on the `users` document, since the later admin-triggered approval/rejection cannot otherwise recover which brand the applicant used.
  - **Account Approved / Welcome Email (`accept.post.ts`)**: Formatted with a prominent, styled credential highlight box for the temporary password and a direct "Log In to Your Dashboard" CTA button, branded using the persisted `data.site` / `data.siteUrl` (falling back to `amiunderpaid` / `config.public.siteUrl` for pre-existing requests that predate this field).
  - **Application Rejection Email (`reject.post.ts`)**: Polite, branded response signed off by the platform team, using the same persisted `data.site` / `data.siteUrl` fallback.

- **4. Testing & Verification**:
  - Create comprehensive unit tests in `server/utils/tests/emailTemplate.spec.ts` asserting responsive layout generation, XSS sanitization, logo URL handling, CTA rendering, dual-brand support, and `resolveBrandFromHost()` classification.
  - Update route unit tests in `server/api/user/leads/tests/submit.spec.ts`, `server/api/user/recruiter/tests/request-access.spec.ts`, `server/api/admin/recruiters/tests/accept.spec.ts`, and `server/api/admin/recruiters/tests/reject.spec.ts`.

### Scope & Non-Goals

- **In Scope**:
  - Reusable, zero-dependency server template engine generating cross-client inline CSS.
  - AmI logo embedding, primary color accents, data highlight blocks, and CTA buttons.
  - Upgrading all transactional emails queued via the Firestore `mail` collection (`submit.post.ts`, `accept.post.ts`, `reject.post.ts`).
  - Server-side brand resolution (`resolveBrandFromHost()`) so each email is branded/linked for the domain it actually pertains to, and a new `site`/`siteUrl` field persisted on the `users` document at `request-access.post.ts` time so `accept.post.ts`/`reject.post.ts` can recover that brand later.
  - Full unit test coverage for the template generator and the brand-resolution helper.
- **Non-Goals**:
  - Adding heavy third-party email rendering frameworks (e.g. MJML, React Email).
  - Modifying internal developer cron crash logs in Resend (plain text alert format is intentional for dev readability).
  - Restructuring the single-Vercel-project multi-domain setup itself (e.g. splitting into per-brand deployments) — this proposal works within that existing topology.

## Capabilities

### New Capabilities

- `branded-email-templates`: Defines the responsive HTML email template generator, brand logo embedding, AmI primary color styling, CTA buttons, structured data blocks, and server-side brand/site-URL resolution for transactional emails.

### Modified Capabilities

- `firestore-emails-setup`: Updates the requirement that all transactional emails written to the `mail` collection MUST use the standardized branded HTML template format alongside plaintext fallback.
- `recruiter-access-request`: Replaces the existing "correct login link per deployment via `NUXT_PUBLIC_SITE_URL`" requirement (which assumed a per-brand deployment that does not exist — this is one Vercel project serving all three domains) with brand/site-URL persisted on the `users` document at request time and read back at approval/rejection time.

## Impact

- **Server Endpoints & Utilities**:
  - `server/utils/emailTemplate.ts` (New — includes `renderBrandedEmail()` and `resolveBrandFromHost()`)
  - `server/api/user/leads/submit.post.ts`
  - `server/api/user/recruiter/request-access.post.ts`
  - `server/api/admin/recruiters/accept.post.ts`
  - `server/api/admin/recruiters/reject.post.ts`
- **Data**:
  - `users` collection: new `site` (`'amiunderpaid' | 'benchmarkmyrole'`) and `siteUrl` (string) fields, written at `request-access.post.ts` time.
- **Tests**:
  - `server/utils/tests/emailTemplate.spec.ts` (New)
  - `server/api/user/leads/tests/submit.spec.ts`
  - `server/api/user/recruiter/tests/request-access.spec.ts`
  - `server/api/admin/recruiters/tests/accept.spec.ts`
  - `server/api/admin/recruiters/tests/reject.spec.ts`
