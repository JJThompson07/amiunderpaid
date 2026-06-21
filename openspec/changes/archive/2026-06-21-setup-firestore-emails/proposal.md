## Why

Currently, the Nitro backend writes lead email payloads to the Firestore `mail` collection, but these emails are not sent because the Firebase "Trigger Email from Firestore" extension has not yet been installed and configured. This change outlines the step-by-step instructions to set up the Firebase Extension, configure SMTP credentials, and apply minor code improvements to the Nitro route to ensure high email deliverability.

## What Changes

- **Firebase Console Configuration**: Install and configure the `Trigger Email from Firestore` extension.
- **Code Tweak**: Update the email payload structure in the Nitro backend to include a plaintext `text` representation alongside the HTML content. This improves deliverability and prevents spam classification.
- **Verification**: Manually trigger lead generation and verify email reception in both target recruiter and candidate inboxes.

## Capabilities

### New Capabilities
- `firestore-emails-setup`: Configure and enable Firebase Trigger Email extension to send notifications to recruiters and candidates when new leads are submitted.

### Modified Capabilities
<!-- No requirement changes to existing specs -->
