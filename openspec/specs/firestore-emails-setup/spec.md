# firestore-emails-setup Specification

## Purpose

Defines the configuration and collections for triggering outbound emails via Firestore.

## Requirements

### Requirement: Plaintext fallback for lead emails

The Nitro lead submission endpoint SHALL include a plaintext `text` representation inside the `message` object when writing to the `mail` collection.

#### Scenario: Submitting a lead successfully queues plaintext email

- **WHEN** a lead is submitted to the API at `server/api/user/leads/submit.post.ts`
- **THEN** the system SHALL write a document to the `mail` collection with a `message.text` field containing a readable plaintext summary of the email content in addition to the HTML content.

### Requirement: Email Triggering on Mail Collection

The Firestore "Trigger Email" extension SHALL monitor the `mail` collection and send emails containing the correct `to`, `message.subject`, `message.html`, and `message.text` fields. All customer and partner transactional emails queued to `mail` collection MUST use the standardized branded email template utility for HTML rendering.

#### Scenario: Extension processes mail document

- **WHEN** a document is added to the `mail` collection
- **THEN** the Firebase extension SHALL attempt SMTP delivery and update the document with `delivery.state` set to `SUCCESS`.

#### Scenario: Extension processes mail document with branded HTML and plaintext fallback

- **WHEN** a transactional email is queued to the `mail` collection by an API endpoint (`submit.post.ts`, `accept.post.ts`, `reject.post.ts`)
- **THEN** the system SHALL write a document containing `to`, `message.subject`, `message.html` (rendered using the branded email template utility), and `message.text` (structured plaintext summary).
