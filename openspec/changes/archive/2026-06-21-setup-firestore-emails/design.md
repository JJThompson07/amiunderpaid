## Context

The AmIUnderpaid platform writes recruiter lead notifications and candidate confirmation emails to the Firestore `mail` collection in the Nitro API route `server/api/user/leads/submit.post.ts`. However, these emails are not currently being dispatched to SMTP because the Firebase "Trigger Email from Firestore" extension needs configuration. 

This design outlines:
1. Steps to install and configure the Firebase Trigger Email Extension.
2. Code adjustments for the Nitro backend to supply a plaintext fallback (`text`), reducing spam risk and improving email deliverability.

## Goals / Non-Goals

**Goals:**
- Detail Firebase Console settings for the `Trigger Email from Firestore` extension.
- Update `server/api/user/leads/submit.post.ts` to include plaintext `text` inside the `message` payload.
- Establish a verification plan using the extension's automatic Firestore document updates (`delivery` field).

**Non-Goals:**
- Creating or hosting SMTP service accounts (SendGrid/Mailgun/etc.).
- Designing custom templates stored in Firestore (we will continue to write raw HTML/text directly).

## Decisions

### Decision 1: Add plaintext `text` to all queued mail documents
- **Rationale**: HTML-only emails are frequently flagged by aggressive spam filters. Including a plaintext body significantly improves email reputation and inboxing.

### Decision 2: Restrict `mail` collection write access via security rules
- **Rationale**: Clients should never be allowed to write directly to the `mail` collection to prevent spam abuse and SMTP server exploitation. Writes must only happen via the Admin SDK in the Nitro backend.

## Risks / Trade-offs

- **SMTP credential exposure in configuration**
  - *Mitigation*: SMTP password and username will be stored securely using Google Cloud Secret Manager (default behavior for Firebase Extensions).
- **Spam flags on candidate auto-replies**
  - *Mitigation*: Ensure the `from` address uses a verified domain with valid SPF/DKIM/DMARC records.
