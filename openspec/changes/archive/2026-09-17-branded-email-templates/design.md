## Context

Outbound transactional emails in this repository are dispatched asynchronously via Firestore's `mail` collection (processed by the Firebase Trigger Email extension). Currently, endpoints (`server/api/user/leads/submit.post.ts`, `server/api/admin/recruiters/accept.post.ts`, and `server/api/admin/recruiters/reject.post.ts`) build ad-hoc HTML strings containing basic unstyled `<h2>` and `<p>` elements.

This design introduces a centralized, zero-dependency email rendering utility (`server/utils/emailTemplate.ts`) adhering to HTML email development best practices (table-based layout, inline CSS, universal email client support) while reflecting the platform's visual identity.

## Goals / Non-Goals

**Goals:**

- Provide a standardized, type-safe HTML email template engine in `server/utils/emailTemplate.ts`.
- Brand transactional emails with official logos (`amiunderpaid-logo.png` / `benchmarkmyrole-logo.png`), primary brand colors (`#1cabb0` for AmIUnderpaid, `#dd8c40` for BenchmarkMyRole), structured data cards, styled CTA buttons, and professional sign-offs.
- Ensure 100% email client compatibility across Gmail (web/mobile), Apple Mail, Outlook (Windows/Mac/Web), and Yahoo Mail without CSS breakage or clipped tables.
- Prevent XSS vulnerabilities by escaping user-provided values before HTML embedding.
- Maintain paired plaintext (`text`) fallbacks for every email.

**Non-Goals:**

- Introducing heavy third-party template frameworks (e.g. MJML, React Email, Vue Email).
- Modifying internal developer alerts sent directly via Resend (`server/api/cron/sync-trends.get.ts`, Stripe webhooks).

## Decisions

### Decision 1: Pure TypeScript Template Builder Pattern

- **Choice**: Implement `renderBrandedEmail(options: BrandedEmailOptions): string` in `server/utils/emailTemplate.ts` using template literals and modular HTML component builders.
- **Rationale**: Keeps Nitro server builds lightweight, eliminates compilation step overhead, avoids Node native binary dependencies, and provides immediate unit-testability in Vitest.
- **Alternatives Considered**:
  - _MJML_: Compiles clean responsive email HTML, but requires additional heavyweight npm packages and can introduce runtime overhead during SSR/serverless execution.
  - _React/Vue Email_: Requires JSX/Vue compilation pipelines on the server, adding unnecessary complexity for 4 transactional email templates.

### Decision 2: Table-Based Responsive Email Layout with Inline CSS

- **Choice**: Use HTML `<table>` containers with `role="presentation"`, fixed `max-width: 600px`, and inline CSS properties for layout, fonts, and colors.
- **Palette Tokens**:
  - Backdrop: `#f8fafc` (slate-50)
  - Card Container: `#ffffff` (white), border `#e2e8f0` (slate-200), border-radius `8px`
  - AmIUnderpaid Primary: `#1cabb0` (teal-500), dark hover `#14868d` (teal-600), subtle tint `#f1fcfc` (teal-50)
  - BenchmarkMyRole Primary: `#dd8c40` (orange-500), dark hover `#cd6d29` (orange-600), subtle tint `#fdf8ef` (orange-50)
  - Body Text: `#0f172a` (slate-900), Secondary Text: `#475569` (slate-600), Muted: `#94a3b8` (slate-400)
  - Font Stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`
- **Rationale**: Many email clients (especially desktop Outlook) ignore modern CSS features such as `display: flex`, CSS grid, and `<style>` blocks in the `<head>`. Table-based inline styles guarantee consistent rendering.

### Decision 3: Component Building Blocks

The utility exports modular helpers used by `renderBrandedEmail`:

1. **`renderLogoHeader(brand, siteUrl)`**: Centered brand logo linking to `siteUrl` with fallback alt text.
2. **`renderDataBox(items: Array<{ label: string; value: string }>)`**: Styled table card displaying key-value pairs (used in recruiter lead notifications).
3. **`renderCredentialBox(label: string, code: string, note?: string)`**: Highlighted monospace callout box for one-time passwords with a subtle tinted background and bordered frame (used in recruiter approval emails).
4. **`renderCtaButton(cta: { label: string; url: string }, brandPrimaryColor)`**: Centered bulletproof button table with primary background color and padding.
5. **`renderSignOff(brandName)`**: Standardized closing ("Best regards,\nThe Team at [BrandName]").
6. **`renderFooter(siteUrl, brandName)`**: Unobtrusive footer with platform copyright and link.

### Decision 4: Dual-Brand Support and Runtime Resolution

- **Choice**: `renderBrandedEmail` accepts an optional `brand` parameter (`'amiunderpaid' | 'benchmarkmyrole'`), defaulting to `'amiunderpaid'`, and an explicit `siteUrl` string used to build the logo `src` and all CTA/link URLs.
  - AmIUnderpaid: `${siteUrl}/amiunderpaid-logo.png`
  - BenchmarkMyRole: `${siteUrl}/benchmarkmyrole-logo.png`
- **Rejected approach**: Resolving `siteUrl` internally via `useRuntimeConfig().public.siteUrl`. Verified against `.vercel/repo.json` and the live Vercel project (`get_project` on `prj_PgKmh9wzUPm96dEfkN6mF8Dvpvog`): this repo is **one single Vercel project** with all three production domains (`www.amiunderpaid.co.uk`, `www.amiunderpaid.com`, `www.benchmarkmyrole.com`) attached as aliases of the same deployment, not three separate deployments each with their own env var. `NUXT_PUBLIC_SITE_URL` is therefore one shared value across all three domains — it cannot correctly represent "the current domain" for any of them, so the existing `recruiter-access-request` spec requirement that assumes a per-deployment value ("so the correct login link is sent for each deployment") does not hold against the real infrastructure. `siteUrl` must instead be resolved per-request (Decision 6) or persisted at the point a request originally arrived (Decision 7), never read from the static runtime config inside the template utility itself.

### Decision 5: Centralized XSS Sanitization

- **Choice**: The utility includes a robust `escapeHtml(text: string): string` helper that escapes `&`, `<`, `>`, `"`, and `'`. All dynamic input fields passed into headers, paragraphs, and data rows are escaped by default.
- **Interaction with existing sanitization**: `submit.post.ts` already hand-rolls an equivalent `sanitizeHTML()` and stores/reuses the sanitized values (`safeName`, `safeSearchedRole`, `safeLocation`, `safeAgencyName`) for both the Firestore `leads` write and the current inline email HTML. When this endpoint is migrated to `renderBrandedEmail()`, the **raw** `name`/`searchedRole`/`location`/`agencyName` values (not the pre-escaped `safe*` variants) must be passed into the template's data-box/paragraph fields, since `escapeHtml()` becomes the single point of HTML escaping for anything rendered into `message.html`. Passing already-escaped strings through `escapeHtml()` a second time would double-encode entities (e.g. `&amp;` → `&amp;amp;`) and visibly corrupt the rendered email. The `safe*` variants remain correct as-is for the plaintext `text` field and the Firestore `leads` document, which are unaffected by this change.

### Decision 6: Server-Side Brand Resolution for Same-Request Sends

- **Problem**: `renderBrandedEmail`'s `brand`/`siteUrl` parameters must come from somewhere. The client-side brand detection in `app/plugins/tenant.ts` (`useState` + `useRequestURL`, exposed as `$siteBrand` via `useNuxtApp()`) is a **Vue Nuxt plugin** — it only runs in the SSR/CSR Vue render tree and is not reachable from Nitro API routes (`server/api/**`). No existing server-side equivalent exists; the one precedent for reading the request host server-side (`getRequestHost(event)` in `server/api/stripe/create-checkout.post.ts`) only builds a checkout redirect URL, it does not classify a brand.
- **Choice**: Add a small helper in `server/utils/emailTemplate.ts`, `resolveBrandFromHost(event)`, that mirrors `tenant.ts`'s hostname check server-side:
  ```ts
  function resolveBrandFromHost(event: H3Event): {
    brand: 'amiunderpaid' | 'benchmarkmyrole';
    siteUrl: string;
  } {
    const host = getRequestHost(event);
    const protocol = getRequestProtocol(event);
    const brand = host.includes('benchmarkmyrole') ? 'benchmarkmyrole' : 'amiunderpaid';
    return { brand, siteUrl: `${protocol}://${host}` };
  }
  ```
- **Scope**: This is valid **only** for endpoints where the email is queued within the same request that a user made against the brand's own domain — verified as true for:
  - `submit.post.ts` — candidate lead submission. Confirmed via `grep -rln "LeadContact" app`: `app/components/AmI/Card/LeadContact.vue` (the form that posts here) is rendered on both `app/pages/salary/...` (amiunderpaid) and `app/pages/benchmark/...` (benchmarkmyrole) pages, so the inbound request's host is authoritative for both the recruiter-notification and candidate-confirmation emails it queues.
  - `request-access.post.ts` — recruiter access request. Confirmed via `grep -rln "RequestAccess" app`: the modal is only opened from `app/pages/recruiter/login.vue`, which itself branches on `$siteBrand === 'benchmarkmyrole'`, i.e. recruiters already apply from both brands' login pages today.
- It is **not** valid for `accept.post.ts` / `reject.post.ts` — see Decision 7.

### Decision 7: Persisted Brand for Admin-Triggered Sends

- **Problem**: `accept.post.ts` and `reject.post.ts` are invoked later, by an admin acting from the admin console (`verifyAdmin(event)`), not by the recruiter. The admin's own request host reflects wherever the admin happens to be logged in, not the brand the recruiter originally applied under — resolving brand from `getRequestHost(event)` in these two routes would be actively wrong. Recruiter `users` documents also currently store no brand/site field at all (confirmed by reading `request-access.post.ts` in full — it writes only `agency_name`, `email`, `role`, `status`, `created_at`).
- **Choice**: `request-access.post.ts` resolves `{ brand, siteUrl }` via `resolveBrandFromHost(event)` (Decision 6) at request time and persists both as new fields on the `users` document: `site: 'amiunderpaid' | 'benchmarkmyrole'` and `siteUrl: string`. `accept.post.ts` and `reject.post.ts` read `data.site` / `data.siteUrl` back off the fetched document and pass them straight to `renderBrandedEmail`, instead of deriving anything from their own request or from `config.public.siteUrl`.
- **Backward compatibility**: Any pre-existing `users` document with `status: 'requested'` created before this change has neither field. Both endpoints fall back to `brand: 'amiunderpaid'` and `siteUrl: config.public.siteUrl` (the prior behavior) when `data.site` / `data.siteUrl` are absent, so in-flight applications are not broken by the schema addition.
- **Firestore rules impact**: None — `request-access.post.ts` writes via `firebase-admin` (Admin SDK), which bypasses `firestore.rules` entirely, and the new fields are not in the `users` match block's restricted-key list (`role`, `status`, `activeTerritories`, `basicDiscount`, `exclusiveDiscount`, `stripeSubscriptionId`) that governs client writes, so no rules change is required.

## Risks / Trade-offs

- **[Risk] Logo Image Blocking**: Some email clients disable remote images by default.
  - **Mitigation**: Logo `<img>` tags include explicit `alt`, `width`, `height`, and inline typography fallback so layout structure remains intact if images are blocked.
- **[Risk] Dark Mode Client Inversion**: Some clients (Apple Mail, Outlook mobile) invert email colors in dark mode.
  - **Mitigation**: Container card has explicit background color (`#ffffff`) and high-contrast dark text (`#0f172a`), with transparent outer margins and neutral card borders (`#e2e8f0`) that invert cleanly.
