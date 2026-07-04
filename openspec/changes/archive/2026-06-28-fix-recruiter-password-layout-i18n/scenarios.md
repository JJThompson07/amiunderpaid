## Scenarios

### Scenario: English translations display correctly

- **GIVEN** the application language is set to English
- **WHEN** the user views the password reset or password change form
- **THEN** the labels must display as "New Password" (and similar English text) instead of literal keys like `account.form.new-password` or `passwordChange.newPasswordLabel`.

### Scenario: Mobile responsiveness of password change form

- **GIVEN** the user is viewing the recruiter profile on a mobile device
- **WHEN** they navigate to the password change section
- **THEN** the input fields (Current, New, Confirm) must stack vertically and maintain readability without breaking the container width.

### Scenario: Visual separation of password fields

- **GIVEN** the user is viewing the password change form
- **WHEN** the fields are rendered
- **THEN** there must be a clear visual divider between the "Current Password" section and the "New Password" section.
