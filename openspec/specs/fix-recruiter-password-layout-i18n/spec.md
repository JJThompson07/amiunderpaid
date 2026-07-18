# fix-recruiter-password-layout-i18n Specification

## Purpose

TBD - created by archiving change fix-recruiter-password-layout-i18n. Update Purpose after archive.

## Requirements

### Requirement: Recruiter password forms localization

The password reset and change forms SHALL render translated strings for all labels and placeholders instead of literal translation keys.
The keys SHALL be structured and sourced from `account.json` (e.g., `account.form.new-password` or `account.passwordChange.newPasswordLabel`).

#### Scenario: English translations display correctly

- **GIVEN** the application language is set to English
- **WHEN** the user views the password reset or password change form
- **THEN** the labels must display as "New Password" (and similar English text) instead of literal keys like `account.form.new-password` or `passwordChange.newPasswordLabel`.

### Requirement: Recruiter password change layout

The password change form within the recruiter profile SHALL display its fields in a vertical layout (`flex-col`) with appropriate spacing (e.g., `gap-6`).
There SHALL be a distinct visual divider separating the "Current Password" field from the "New Password" fields.
The layout SHALL remain responsive and usable on mobile devices, preventing horizontal overflow.

#### Scenario: Mobile responsiveness of password change form

- **GIVEN** the user is viewing the recruiter profile on a mobile device
- **WHEN** they navigate to the password change section
- **THEN** the input fields (Current, New, Confirm) must stack vertically and maintain readability without breaking the container width.

#### Scenario: Visual separation of password fields

- **GIVEN** the user is viewing the password change form
- **WHEN** the fields are rendered
- **THEN** there must be a clear visual divider between the "Current Password" section and the "New Password" section.
