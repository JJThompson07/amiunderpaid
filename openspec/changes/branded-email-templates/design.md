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
  - *MJML*: Compiles clean responsive email HTML, but requires additional heavyweight npm packages and can introduce runtime overhead during SSR/serverless execution.
  - *React/Vue Email*: Requires JSX/Vue compilation pipelines on the server, adding unnecessary complexity for 4 transactional email templates.

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
- **Choice**: `renderBrandedEmail` accepts an optional `brand` parameter (`'amiunderpaid' | 'benchmarkmyrole'`), defaulting to `'amiunderpaid'`.
- **Asset URLs**: The logo image and site links resolve using `useRuntimeConfig().public.siteUrl` or a fallback `https://amiunderpaid.co.uk`.
  - AmIUnderpaid: `${siteUrl}/amiunderpaid-logo.png`
  - BenchmarkMyRole: `${siteUrl}/benchmarkmyrole-logo.png`

### Decision 5: Centralized XSS Sanitization
- **Choice**: The utility includes a robust `escapeHtml(text: string): string` helper that escapes `&`, `<`, `>`, `"`, and `'`. All dynamic input fields passed into headers, paragraphs, and data rows are escaped by default.

## Risks / Trade-offs

- **[Risk] Logo Image Blocking**: Some email clients disable remote images by default.
  - **Mitigation**: Logo `<img>` tags include explicit `alt`, `width`, `height`, and inline typography fallback so layout structure remains intact if images are blocked.
- **[Risk] Dark Mode Client Inversion**: Some clients (Apple Mail, Outlook mobile) invert email colors in dark mode.
  - **Mitigation**: Container card has explicit background color (`#ffffff`) and high-contrast dark text (`#0f172a`), with transparent outer margins and neutral card borders (`#e2e8f0`) that invert cleanly.
