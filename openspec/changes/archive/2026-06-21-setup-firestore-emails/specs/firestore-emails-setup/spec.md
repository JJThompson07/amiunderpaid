## ADDED Requirements

### Requirement: Plaintext fallback for lead emails
The Nitro lead submission endpoint SHALL include a plaintext `text` representation inside the `message` object when writing to the `mail` collection.

#### Scenario: Submitting a lead successfully queues plaintext email
- **WHEN** a lead is submitted to the API at `server/api/user/leads/submit.post.ts`
- **THEN** the system SHALL write a document to the `mail` collection with a `message.text` field containing a readable plaintext summary of the email content in addition to the HTML content.

### Requirement: Email Triggering on Mail Collection
The Firestore "Trigger Email" extension SHALL monitor the `mail` collection and send emails containing the correct `to`, `message.subject`, `message.html`, and `message.text` fields.

#### Scenario: Extension processes mail document
- **WHEN** a document is added to the `mail` collection
- **THEN** the Firebase extension SHALL attempt SMTP delivery and update the document with `delivery.state` set to `SUCCESS`.
