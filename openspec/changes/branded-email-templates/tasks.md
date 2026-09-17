## 1. Core Branded Email Utility

- [ ] 1.1 Create `server/utils/emailTemplate.ts` implementing `renderBrandedEmail()` with responsive HTML table container, brand logo header (`/amiunderpaid-logo.png` / `/benchmarkmyrole-logo.png`), primary color accents (`#1cabb0` / `#dd8c40`), `escapeHtml()` sanitization, and helper renderers for data boxes, credential callouts, CTA buttons, and team sign-offs ("Best regards,\nThe Team at AmIUnderpaid" / "The Team at BenchmarkMyRole").
- [ ] 1.2 Create unit tests in `server/utils/tests/emailTemplate.spec.ts` covering default rendering, brand variations (AmIUnderpaid vs. BenchmarkMyRole), HTML escaping, CTA button markup, data box row formatting, credential box styling, and optional field omissions. Verify with `pnpm vitest run server/utils/tests/emailTemplate.spec.ts`.

## 2. Lead Notification & Candidate Receipt Integration

- [ ] 2.1 Update `server/api/user/leads/submit.post.ts` to format the recruiter lead notification email using `renderBrandedEmail()` with a structured candidate data box (Name, Email, Role, Location) and a "View Lead in Dashboard" CTA button.
- [ ] 2.2 Update `server/api/user/leads/submit.post.ts` to format the candidate confirmation email using `renderBrandedEmail()` with a reassurance message and sign-off from "The Team at AmIUnderpaid".
- [ ] 2.3 Update unit tests in `server/api/user/leads/tests/submit.spec.ts` to assert that both recruiter and candidate mail payloads contain the new branded HTML structure and matching plaintext summaries. Verify with `pnpm vitest run server/api/user/leads/tests/submit.spec.ts`.

## 3. Recruiter Onboarding & Rejection Integration

- [ ] 3.1 Update `server/api/admin/recruiters/accept.post.ts` to format the welcome/approval email using `renderBrandedEmail()` with a highlighted temporary password credential box, password change advisory, and a "Log In to Your Dashboard" CTA button.
- [ ] 3.2 Update `server/api/admin/recruiters/reject.post.ts` to format the application rejection email using `renderBrandedEmail()` with a polite notification body and team sign-off.
- [ ] 3.3 Update unit tests in `server/api/admin/recruiters/tests/accept.spec.ts` and `server/api/admin/recruiters/tests/reject.spec.ts` to assert that the queued mail documents contain the branded HTML structure and matching plaintext summaries. Verify with `pnpm vitest run server/api/admin/recruiters/tests/`.

## 4. Verification & Gate Checks

- [ ] 4.1 Run full test and lint verification suite using `pnpm test:verify` (typecheck, lint, coverage 80%+ per-file gate, e2e tests, firestore rules) and ensure 100% pass rate.
