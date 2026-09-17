## Why

Outbound customer- and recruiter-facing emails (such as candidate lead notifications, candidate confirmation receipts, recruiter access approval credentials, and application rejections) currently use raw, unstyled HTML strings (`<h2>`, `<p>`). These emails appear bare and unpolished, lack visual brand identity (no logo or primary color styling), and risk inconsistent rendering across email clients (Gmail, Apple Mail, Outlook). Upgrading outbound communications to responsive, beautifully styled HTML templates with official logos, AmI primary colors (`#1cabb0`), highlighted data cards, call-to-action buttons, and professional sign-offs from "The Team at AmIUnderpaid" will significantly elevate platform trust and brand credibility.

## What Changes

- **1. Server-Side Branded Email Template Utility (`server/utils/emailTemplate.ts`)**:
  - Create a reusable, cross-client-compatible HTML email builder function `renderBrandedEmail()`.
  - Include the brand logo (`/amiunderpaid-logo.png` / `/benchmarkmyrole-logo.png` resolved from `config.public.siteUrl`), responsive container with off-white backdrop (`#f8fafc`), and a crisp white content card (`#ffffff`) with subtle borders and primary color accents.
  - Apply the **AmI primary color palette** (Primary Teal `#1cabb0`, Dark Slate `#0f172a`, Muted Text `#475569`, Accent Borders `#e2e8f0`).
  - Provide reusable helper components:
    - **Highlight Data Boxes**: Clean summary tables for structured details (e.g. candidate name/role/location or temporary login credentials).
    - **Call-to-Action (CTA) Buttons**: Bulletproof, styled pill buttons with primary teal background and bold white text.
    - **Professional Sign-Off**: Consistent sign-off ("Best regards,\nThe Team at AmIUnderpaid" / "The Team at BenchmarkMyRole").
    - **Footer**: Brand links, support info, and copyright notice.

- **2. Recruiter Lead Notification & Candidate Receipt (`server/api/user/leads/submit.post.ts`)**:
  - **Recruiter Lead Email**: Formatted with a structured candidate overview card (Name, Email, Role, Location) and a direct "View Lead in Dashboard" CTA button.
  - **Candidate Confirmation Email**: Formatted with a reassuring summary acknowledging that their inquiry has been forwarded to the partner agency.

- **3. Recruiter Onboarding & Application Emails (`server/api/admin/recruiters/`)**:
  - **Account Approved / Welcome Email (`accept.post.ts`)**: Formatted with a prominent, styled credential highlight box for the temporary password and a direct "Log In to Your Dashboard" CTA button.
  - **Application Rejection Email (`reject.post.ts`)**: Polite, branded response signed off by the platform team.

- **4. Testing & Verification**:
  - Create comprehensive unit tests in `server/utils/tests/emailTemplate.spec.ts` asserting responsive layout generation, XSS sanitization, logo URL handling, CTA rendering, and dual-brand support.
  - Update route unit tests in `server/api/user/leads/tests/submit.spec.ts`, `server/api/admin/recruiters/tests/accept.spec.ts`, and `server/api/admin/recruiters/tests/reject.spec.ts`.

### Scope & Non-Goals

- **In Scope**:
  - Reusable, zero-dependency server template engine generating cross-client inline CSS.
  - AmI logo embedding, primary color accents, data highlight blocks, and CTA buttons.
  - Upgrading all transactional emails queued via the Firestore `mail` collection (`submit.post.ts`, `accept.post.ts`, `reject.post.ts`).
  - Full unit test coverage for the template generator.
- **Non-Goals**:
  - Adding heavy third-party email rendering frameworks (e.g. MJML, React Email).
  - Modifying internal developer cron crash logs in Resend (plain text alert format is intentional for dev readability).

## Capabilities

### New Capabilities
- `branded-email-templates`: Defines the responsive HTML email template generator, brand logo embedding, AmI primary color styling, CTA buttons, and structured data blocks for transactional emails.

### Modified Capabilities
- `firestore-emails-setup`: Updates the requirement that all transactional emails written to the `mail` collection MUST use the standardized branded HTML template format alongside plaintext fallback.

## Impact

- **Server Endpoints & Utilities**:
  - `server/utils/emailTemplate.ts` (New)
  - `server/api/user/leads/submit.post.ts`
  - `server/api/admin/recruiters/accept.post.ts`
  - `server/api/admin/recruiters/reject.post.ts`
- **Tests**:
  - `server/utils/tests/emailTemplate.spec.ts` (New)
  - `server/api/user/leads/tests/submit.spec.ts`
  - `server/api/admin/recruiters/tests/accept.spec.ts`
  - `server/api/admin/recruiters/tests/reject.spec.ts`
