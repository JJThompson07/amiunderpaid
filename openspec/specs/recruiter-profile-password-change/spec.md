# recruiter-profile-password-change Specification

## Purpose

TBD - created by archiving change restrict-recruiter-onboarding. Update Purpose after archive.
## Requirements
### Requirement: Profile password update form

The recruiter profile page SHALL include a "Change Password" form requiring the recruiter to enter their current password, their new password, and a confirmation of their new password.

#### Scenario: Successful password change

- **WHEN** the recruiter provides their valid current password and matching new passwords, and submits the form
- **THEN** the system SHALL re-authenticate the user session, update their password in Firebase Auth, clear the `requiresPasswordChange` flag on their Firestore user document, and show a success toast

### Requirement: Re-authentication check

The password change process MUST re-authenticate the user with Firebase Auth before updating the password to ensure they know the current password.

#### Scenario: Password change fails due to incorrect current password

- **WHEN** the recruiter enters an incorrect current password and submits the form
- **THEN** the system SHALL fail to re-authenticate, retain the current password, and display an error message without updating the password in Firebase Auth

### Requirement: Forced password change navigation guard

The system SHALL detect if a logged-in recruiter has the `requiresPasswordChange` flag set to true and restrict their access.

#### Scenario: Logged in recruiter with temporary password is redirected

- **WHEN** a recruiter with `requiresPasswordChange` set to true attempts to access any dashboard or territory page
- **THEN** the navigation middleware SHALL redirect them to their profile page and display a notice prompting them to change their password

### Requirement: Recruiter logout from navigation bar

The recruiter navigation menu SHALL include a "Log Out" item on all pages. On desktop screens, this item SHALL be positioned on the far right-hand side of the navigation bar. The item MUST be implemented using the custom `<AmIButton>` component with the props `bg-colour="bg-slate-500"` and `animation-colour="bg-slate-400"`, rendering text using the translation key `common.logout`. On mobile screens, the button SHALL appear as the final item in the mobile navigation list.

#### Scenario: Recruiter logs out from navigation

- **WHEN** a recruiter clicks the "Log Out" button in the desktop or mobile navigation menu
- **THEN** the system SHALL end their session, clear cookies, and redirect them to the recruiter login page

