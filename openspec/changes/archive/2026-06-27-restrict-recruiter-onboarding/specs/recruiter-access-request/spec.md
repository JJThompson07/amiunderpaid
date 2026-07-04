## ADDED Requirements

### Requirement: Recruiter access request submission

The system SHALL provide a public-facing "Request Access" form on the recruiter login page that captures the candidate agency name and email.

#### Scenario: Successful access request submission

- **WHEN** a user enters a valid name and email in the "Request Access" form and submits it
- **THEN** the system SHALL create a document in the `users` Firestore collection with `role` set to "recruiter", `status` set to "requested", and the provided name and email, and show a success confirmation message

### Requirement: Disabling public registration

The recruiter login page SHALL NOT allow public self-registration.

#### Scenario: Recruiter signup is disabled

- **WHEN** the recruiter login page renders
- **THEN** the registration tab or self-registration fields SHALL NOT be available, and a link/button to "Request Access" SHALL be visible instead

### Requirement: Admin listing of access requests

The admin recruiter management dashboard SHALL display recruiters with a status of "requested" alongside active recruiters, showing relevant details.

#### Scenario: Viewing requested access recruiters in admin dashboard

- **WHEN** an administrator views the recruiter management page
- **THEN** the table SHALL display recruiters with a status of "requested" and highlight their status as "Requested Access"

### Requirement: Admin approval of recruiter access request

The admin recruiter dashboard SHALL allow administrators to accept access requests, which triggers user account creation with a temporary password and sends an invitation email.

#### Scenario: Accepting an access request

- **WHEN** an administrator clicks the "Accept" button for a recruiter with "requested" status
- **THEN** the server SHALL generate a random temporary password, create a Firebase Auth user utilizing the Firestore document ID as the UID, set `requiresPasswordChange` to true, update the Firestore status to "active", queue an email with the temporary password to the Firestore `mail` collection, and refresh the UI

### Requirement: Admin rejection of recruiter access request

The admin recruiter dashboard SHALL allow administrators to reject access requests.

#### Scenario: Rejecting an access request

- **WHEN** an administrator clicks the "Reject" button for a recruiter with "requested" status
- **THEN** the server SHALL set the recruiter's status to "rejected" (or remove the document) and update the UI
